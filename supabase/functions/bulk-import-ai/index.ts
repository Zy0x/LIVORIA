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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq ${model} failed (${response.status}): ${err.substring(0, 100)}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  const parsed = extractJsonFromResponse(content) as any;
  return { items: parsed.items || (Array.isArray(parsed) ? parsed : []), model, provider: 'Groq' };
}

async function callGeminiModel(apiKey: string, model: string, systemPrompt: string, userContent: string): Promise<{ items: any[]; model: string; provider: string }> {
  // Use v1beta for better model availability
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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${model} failed (${response.status}): ${err.substring(0, 100)}`);
  }
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  const parsed = extractJsonFromResponse(content) as any;
  return { items: parsed.items || (Array.isArray(parsed) ? parsed : []), model, provider: 'Gemini' };
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

    // Use current working model IDs
    const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    const geminiModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];

    const launchRace = async (models: any[]) => {
      const promises = models.map(m => {
        if (m.provider === 'Groq' && GROQ_API_KEY) return callGroqModel(GROQ_API_KEY, m.id, systemPrompt, text);
        if (m.provider === 'Gemini' && GEMINI_API_KEY) return callGeminiModel(GEMINI_API_KEY, m.id, systemPrompt, text);
        return Promise.reject(new Error('Skipped'));
      }).filter(p => p !== null);

      return await Promise.any(promises);
    };

    try {
      // Step 1: Fast Race (Groq Llama 3.3 + Gemini 1.5 Flash)
      const fastRaceModels = [
        { provider: 'Groq', id: 'llama-3.3-70b-versatile' },
        { provider: 'Gemini', id: 'gemini-1.5-flash' }
      ];
      const result = await launchRace(fastRaceModels);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.warn('Fast race failed, trying secondary race...', e);
      try {
        // Step 2: Secondary Race (Llama 3.1 8B + Gemini 1.5 Flash 8B)
        const secondaryModels = [
          { provider: 'Groq', id: 'llama-3.1-8b-instant' },
          { provider: 'Gemini', id: 'gemini-1.5-flash-8b' }
        ];
        const result = await launchRace(secondaryModels);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e2) {
        console.warn('Secondary race failed, trying final pro fallback...', e2);
        // Step 3: Final Fallback (Gemini 1.5 Pro)
        if (GEMINI_API_KEY) {
          const result = await callGeminiModel(GEMINI_API_KEY, 'gemini-1.5-pro', systemPrompt, text);
          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        throw new Error('All parsing attempts failed. AI services might be overloaded.');
      }
    }

  } catch (error: any) {
    console.error('Final AI Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
