import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
  return `You are a data parser for LIVORIA. Parse text into JSON array of ${mediaType} entries.
Fields: title, season(num), cour, rating(num), note, status("on-going","completed","planned"), is_favorite, is_bookmarked, is_movie, genre, parent_title.
Notes: *=fav+bm, **=bm, OP=fav. Return ONLY valid JSON: {"items": [...]}.`;
}

async function callGroqModel(apiKey: string, model: string, systemPrompt: string, userContent: string): Promise<{ items: any[]; model: string; provider: string }> {
  const response = await withTimeout(
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    }),
    25000,
    `Groq ${model}`
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Groq ${model} failed (${response.status}): ${responseText.substring(0, 100)}`);
  }
  
  try {
    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const parsed = extractJsonFromResponse(content) as any;
    return { items: parsed.items || (Array.isArray(parsed) ? parsed : []), model, provider: 'Groq' };
  } catch (e: any) {
    throw new Error(`Groq ${model} parse error: ${e?.message || e}`);
  }
}

async function callGeminiModel(apiKey: string, model: string, systemPrompt: string, userContent: string): Promise<{ items: any[]; model: string; provider: string }> {
  const response = await withTimeout(
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nInput text to parse:\n${userContent}` }]
          }
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4000 },
      }),
    }),
    25000,
    `Gemini ${model}`
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini ${model} failed (${response.status}): ${responseText.substring(0, 100)}`);
  }
  
  try {
    const data = JSON.parse(responseText);
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const parsed = extractJsonFromResponse(content) as any;
    return { items: parsed.items || (Array.isArray(parsed) ? parsed : []), model, provider: 'Gemini' };
  } catch (e: any) {
    throw new Error(`Gemini ${model} parse error: ${e?.message || e}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { text, mediaType, defaultStatus } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const systemPrompt = buildSystemPrompt(mediaType, defaultStatus);

    // Flattened list of models in order of priority to ensure sequential fallback
    const prioritizedModels = [
      // Tier 1
      { provider: 'Groq', id: 'llama-3.3-70b-versatile' },
      { provider: 'Groq', id: 'meta-llama/llama-4-scout-17b-16e-instruct' },
      { provider: 'Gemini', id: 'gemini-1.5-flash-latest' },
      // Tier 2
      { provider: 'Groq', id: 'qwen/qwen3-32b' },
      { provider: 'Groq', id: 'llama-3.1-8b-instant' },
      { provider: 'Gemini', id: 'gemini-1.5-flash-8b-latest' },
      // Tier 3
      { provider: 'Groq', id: 'openai/gpt-oss-120b' },
      { provider: 'Groq', id: 'moonshotai/kimi-k2-instruct' },
      { provider: 'Gemini', id: 'gemini-1.5-pro-latest' }
    ];

    let lastError = null;
    for (const model of prioritizedModels) {
      try {
        if (model.provider === 'Groq' && GROQ_API_KEY) {
          console.log(`Trying Groq model: ${model.id}`);
          const result = await callGroqModel(GROQ_API_KEY, model.id, systemPrompt, text);
          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (model.provider === 'Gemini' && GEMINI_API_KEY) {
          console.log(`Trying Gemini model: ${model.id}`);
          const result = await callGeminiModel(GEMINI_API_KEY, model.id, systemPrompt, text);
          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (e) {
        console.warn(`Model ${model.id} failed:`, e.message);
        lastError = e;
        continue; // Try next model in sequence
      }
    }

    throw lastError || new Error('All models failed to process the request');

  } catch (error: any) {
    console.error('Final AI Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
