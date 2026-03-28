import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─────────────────────────────────────────────────────────────────────────────
// Timeout wrapper untuk mencegah stuck parsing
// ─────────────────────────────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonStart = cleaned.search(/[\{\[]/);
  const openChar = jsonStart !== -1 ? cleaned[jsonStart] : null;
  const closeChar = openChar === '[' ? ']' : '}';
  const jsonEnd = cleaned.lastIndexOf(closeChar);

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('No JSON object found in AI response');
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
    return JSON.parse(cleaned);
  }
}

function buildSystemPrompt(mediaType: string, defaultStatus: string): string {
  return `You are a data parser for an ${mediaType} tracking app called LIVORIA.

Your task: Parse the user's unstructured text into a structured JSON array of ${mediaType} entries.
The input can be ANY format: plain text, CSV, TSV, JSON, Excel-pasted JSON array, long prompt, or messy unstructured text.

  Each entry must have these fields:
- title (string): The EXACT ${mediaType} title in its most well-known form, properly capitalized. Use the official/canonical name.
- season (number): Season number, default 1. Detect from context like "S2", "Season 3", "II", "IV", etc.
- cour (string): Cour info if any, default ""
- rating (number): Rating 0-10, default 0. Extract if mentioned.
- note (string): The original note/tag from user — preserve EXACTLY as-is (e.g. "*", "**", "OP", "Sad")
- status (string): One of "on-going", "completed", "planned". Default: "${defaultStatus || 'completed'}"
- is_favorite (boolean): Set to true if note contains "*" (but not "**") or "OP".
- is_bookmarked (boolean): Set to true if note contains "*" (including "**").
- is_movie (boolean): true ONLY if it's clearly a movie, not a series
- genre (string): Comma-separated genres ONLY if you are confident. Leave empty "" if unsure.
- parent_title (string): For season > 1, the base series title without season indicator. Empty for season 1.

Critical Rules:
1. PRESERVE original titles as closely as possible. Do NOT invent or guess titles.
2. For Excel/JSON input where data already has a "title" field, use it directly.
3. If the input is a prompt like "saya sudah nonton SAO season 4...", extract each distinct title mentioned.
4. For CSV/TSV with columns, map columns intelligently (first column is usually title).
5. Special Note Parsing:
   - If note is "*" -> is_favorite=true, is_bookmarked=true
   - If note is "**" -> is_favorite=false, is_bookmarked=true
   - If note is "OP" -> is_favorite=true, is_bookmarked=false
6. Return ONLY valid JSON: {"items": [...]}. No markdown, no explanation, no extra text.
7. If a field like "No" or "id" appears, ignore it — it's a row number.

Example output: {"items": [{"title": "Sword Art Online", "season": 4, "cour": "", "rating": 9.5, "note": "*", "status": "completed", "is_favorite": false, "is_bookmarked": false, "is_movie": false, "genre": "", "parent_title": "Sword Art Online"}]}`;
}

/** Retry-aware fetch for AI APIs with exponential backoff on 429 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  providerName: string,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429 && attempt < maxRetries) {
      // Parse retry delay from response if available
      const body = await res.text();
      let waitSec = 5 + attempt * 3; // default: 5s, 8s
      const match = body.match(/try again in ([\d.]+)s/i) || body.match(/retryDelay.*?(\d+)s/i);
      if (match) waitSec = Math.ceil(parseFloat(match[1])) + 1;
      console.log(`${providerName} 429 → waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
      continue;
    }
    return res;
  }
  return await fetch(url, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq Models - Multiple fallback options
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'mixtral-8x7b-32768',
  'llama-3.1-8b-instant',
  'gemma-7b-it',
];

async function callGroq(apiKey: string, systemPrompt: string, userContent: string): Promise<{ items: any[]; model: string; provider: string }> {
  for (const model of GROQ_MODELS) {
    try {
      console.log(`Trying Groq model: ${model}`);
      const response = await withTimeout(
        fetchWithRetry(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              temperature: 0.05,
              max_tokens: 8000,
            }),
          },
          2,
          `Groq (${model})`,
        ),
        40000,
        `Groq ${model} API call`
      );

      if (!response.ok) {
        const errText = await response.text();
        // If 429 or model not available, try next model
        if (response.status === 429 || errText.includes('model_not_found') || errText.includes('not available')) {
          console.warn(`Groq ${model} unavailable/rate-limited, trying next...`);
          continue;
        }
        throw new Error(`Groq ${model} error: ${response.status} - ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      const parsed = extractJsonFromResponse(content) as any;

      if (parsed?.items && Array.isArray(parsed.items)) {
        return { items: parsed.items, model, provider: 'Groq' };
      }
      if (Array.isArray(parsed)) {
        return { items: parsed, model, provider: 'Groq' };
      }
      throw new Error(`Invalid Groq ${model} response structure`);
    } catch (e: any) {
      if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) throw e;
      console.warn(`Groq ${model} failed: ${e.message}, trying next...`);
    }
  }
  throw new Error('All Groq models failed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Models - Multiple fallback options
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite',
];

async function callGemini(apiKey: string, systemPrompt: string, userContent: string): Promise<{ items: any[]; model: string; provider: string }> {
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`Trying Gemini model: ${model}`);
      const response = await withTimeout(
        fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ parts: [{ text: userContent }] }],
              generationConfig: { temperature: 0.05, maxOutputTokens: 8000 },
            }),
          },
          2,
          `Gemini(${model})`,
        ),
        40000,
        `Gemini ${model} API call`
      );

      if (!response.ok) {
        const errText = await response.text();
        // If quota exhausted or model not available, try next
        if (
          response.status === 429 ||
          response.status === 403 ||
          errText.includes('RESOURCE_EXHAUSTED') ||
          errText.includes('PERMISSION_DENIED') ||
          errText.includes('MODEL_NOT_FOUND')
        ) {
          console.warn(`Gemini ${model} exhausted/unavailable, trying next model...`);
          continue;
        }
        throw new Error(`Gemini ${model} error: ${response.status} - ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      const parsed = extractJsonFromResponse(content) as any;

      if (parsed?.items && Array.isArray(parsed.items)) {
        return { items: parsed.items, model, provider: 'Gemini' };
      }
      if (Array.isArray(parsed)) {
        return { items: parsed, model, provider: 'Gemini' };
      }
      throw new Error(`Invalid Gemini ${model} response structure`);
    } catch (e: any) {
      if (model === GEMINI_MODELS[GEMINI_MODELS.length - 1]) throw e;
      console.warn(`Gemini ${model} failed: ${e.message}, trying next...`);
    }
  }
  throw new Error('All Gemini models failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, mediaType, defaultStatus } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'No AI API key configured (GROQ_API_KEY or GEMINI_API_KEY)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = buildSystemPrompt(mediaType, defaultStatus);

    const errors: string[] = [];
    let provider = '';
    let model = '';
    let items: any[] = [];

    // Strategy: Build provider list in order of preference
    const providers = [];
    
    if (GROQ_API_KEY) {
      providers.push({
        name: 'Groq',
        call: () => callGroq(GROQ_API_KEY, systemPrompt, text.trim()),
      });
    }
    
    if (GEMINI_API_KEY) {
      providers.push({
        name: 'Gemini',
        call: () => callGemini(GEMINI_API_KEY, systemPrompt, text.trim()),
      });
    }

    // Try each provider in order
    for (const providerConfig of providers) {
      try {
        console.log(`Attempting ${providerConfig.name}...`);
        const result = await providerConfig.call();
        items = result.items;
        provider = result.provider;
        model = result.model;
        console.log(`${result.provider} (${result.model}) OK → ${items.length} items`);
        break; // Success, exit loop
      } catch (e: any) {
        const errMsg = e.message || String(e);
        errors.push(`${providerConfig.name}: ${errMsg}`);
        console.warn(`${providerConfig.name} failed: ${errMsg}`);
        
        // If it's a timeout or rate limit, wait before trying next provider
        if (errMsg.includes('timeout') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.log(`${providerConfig.name} hit limit/timeout, waiting 3s before next provider...`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }

    if (!items.length) {
      return new Response(
        JSON.stringify({ 
          error: `All AI providers failed: ${errors.join('; ')}`,
          provider: 'failed',
          model: 'none',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        items, 
        provider,
        model,
        providerModel: `${provider} (${model})`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Bulk import AI error:', errMsg);
    return new Response(
      JSON.stringify({ 
        error: errMsg, 
        provider: 'error',
        model: 'none',
        providerModel: 'Error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
