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
  return `You are a data parser for an ${mediaType} tracking app called LIVORIA.
Your task: Parse the user's unstructured text into a structured JSON array of ${mediaType} entries.
Each entry must have: title, season (number), cour, rating (number), note, status ("on-going", "completed", "planned"), is_favorite, is_bookmarked, is_movie, genre, parent_title.
Special Note Parsing:
- If note is "*" -> is_favorite=true, is_bookmarked=true
- If note is "**" -> is_favorite=false, is_bookmarked=true
- If note is "OP" -> is_favorite=true, is_bookmarked=false
Return ONLY valid JSON: {"items": [...]}.`;
}

async function callGroqModel(apiKey: string, model: string, systemPrompt: string, userContent: string): Promise<{ items: any[]; model: string; provider: string }> {
  const response = await withTimeout(
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
        temperature: 0.05,
        max_tokens: 4000,
      }),
    }),
    25000,
    `Groq ${model}`
  );

  if (!response.ok) throw new Error(`Groq ${model} failed: ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  const parsed = extractJsonFromResponse(content) as any;
  return { items: parsed.items || parsed, model, provider: 'Groq' };
}

async function callGeminiModel(apiKey: string, model: string, systemPrompt: string, userContent: string): Promise<{ items: any[]; model: string; provider: string }> {
  const response = await withTimeout(
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.05, maxOutputTokens: 4000 },
      }),
    }),
    25000,
    `Gemini ${model}`
  );

  if (!response.ok) throw new Error(`Gemini ${model} failed: ${response.status}`);
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  const parsed = extractJsonFromResponse(content) as any;
  return { items: parsed.items || parsed, model, provider: 'Gemini' };
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

    // RACE STRATEGY: Launch multiple models in parallel for this single chunk
    const modelPromises = [];
    
    if (GROQ_API_KEY) {
      modelPromises.push(callGroqModel(GROQ_API_KEY, 'llama-3.3-70b-versatile', systemPrompt, text));
      modelPromises.push(callGroqModel(GROQ_API_KEY, 'llama-3.1-8b-instant', systemPrompt, text));
    }
    if (GEMINI_API_KEY) {
      modelPromises.push(callGeminiModel(GEMINI_API_KEY, 'gemini-2.0-flash', systemPrompt, text));
      modelPromises.push(callGeminiModel(GEMINI_API_KEY, 'gemini-1.5-flash', systemPrompt, text));
    }

    if (modelPromises.length === 0) throw new Error('No AI keys configured');

    // Promise.any: Return the FASTEST successful response
    const fastestResult = await Promise.any(modelPromises);

    return new Response(JSON.stringify({ 
      items: fastestResult.items, 
      provider: fastestResult.provider,
      model: fastestResult.model,
      providerModel: `${fastestResult.provider} (${fastestResult.model})`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.errors?.[0]?.message || error.message }), { status: 500, headers: corsHeaders });
  }
});
