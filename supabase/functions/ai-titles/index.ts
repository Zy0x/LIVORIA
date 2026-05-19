import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('AI_ALLOWED_ORIGIN') || Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_ACTIONS = new Set([
  'enrich_titles',
  'translate_indonesian',
  'translate_synopsis',
  'expand_donghua_query',
]);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyUser(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

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

async function callGroqModel(apiKey: string, model: string, prompt: string, maxTokens = 1000): Promise<string> {
  const response = await withTimeout(
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: maxTokens,
      }),
    }),
    25000,
    `Groq ${model}`
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Groq ${model} failed (${response.status}): ${responseText.substring(0, 100)}`);
  }
  
  const data = JSON.parse(responseText);
  return (data.choices?.[0]?.message?.content || '').trim();
}

async function callGeminiModel(apiKey: string, model: string, prompt: string, maxTokens = 1000): Promise<string> {
  const response = await withTimeout(
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
      }),
    }),
    25000,
    `Gemini ${model}`
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini ${model} failed (${response.status}): ${responseText.substring(0, 100)}`);
  }
  
  const data = JSON.parse(responseText);
  return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
}

async function callAI(groqKey: string | undefined, geminiKey: string | undefined, prompt: string, maxTokens = 1000): Promise<string> {
  const prioritizedModels = [
    { provider: 'Groq', id: 'llama-3.3-70b-versatile' },
    { provider: 'Gemini', id: 'gemini-1.5-flash-latest' },
    { provider: 'Groq', id: 'llama-3.1-8b-instant' },
    { provider: 'Gemini', id: 'gemini-1.5-flash-8b-latest' }
  ];

  let lastError = null;
  for (const model of prioritizedModels) {
    try {
      if (model.provider === 'Groq' && groqKey) {
        return await callGroqModel(groqKey, model.id, prompt, maxTokens);
      }
      if (model.provider === 'Gemini' && geminiKey) {
        return await callGeminiModel(geminiKey, model.id, prompt, maxTokens);
      }
    } catch (e) {
      console.warn(`Model ${model.id} failed:`, (e as any)?.message || e);
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error('All AI models failed');
}

interface TitleInput {
  stored_title?: string;
  title_english?: string;
  title_romaji?: string;
  title_native?: string;
  season?: number | null;
  part?: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    if (!await verifyUser(req)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      throw new Error('AI API keys not configured');
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const action = typeof body.action === 'string' ? body.action : '';
    if (!ALLOWED_ACTIONS.has(action)) {
      return jsonResponse({ error: 'Unknown action' }, 400);
    }

    if (action === 'enrich_titles') {
      const { titles, mediaType } = body;
      const result = await enrichTitles(GROQ_API_KEY, GEMINI_API_KEY, titles, mediaType);
      return jsonResponse(result);
    }

    if (action === 'translate_indonesian') {
      const { titles, mediaType } = body;
      const result = await translateToIndonesian(GROQ_API_KEY, GEMINI_API_KEY, titles, mediaType);
      return jsonResponse(result);
    }

    if (action === 'translate_synopsis') {
      const { text } = body;
      const result = await translateSynopsis(GROQ_API_KEY, GEMINI_API_KEY, text);
      return jsonResponse(result);
    }

    if (action === 'expand_donghua_query') {
      const { query } = body;
      const result = await expandDonghuaQuery(GROQ_API_KEY, GEMINI_API_KEY, query);
      return jsonResponse(result);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (error: any) {
    console.error('ai-titles error:', error.message);
    return jsonResponse({ error: 'AI title request failed' }, 500);
  }
});

async function enrichTitles(groqKey: string | undefined, geminiKey: string | undefined, titles: TitleInput, mediaType: string) {
  const mainTitle = titles.stored_title || titles.title_english || titles.title_romaji || '';
  if (!mainTitle) return {};

  const isJapanese = mediaType === 'anime';
  const nativeScript = isJapanese ? 'Japanese Kanji/Kana' : 'Chinese Hanzi';
  const romajiType = isJapanese ? 'Romaji Hepburn' : 'Pinyin';

  const prompt = `You are an expert on ${isJapanese ? 'Japanese anime' : 'Chinese donghua'}.
Provide missing title fields for: "${mainTitle}"
Known info: English: "${titles.title_english || ''}", Romaji: "${titles.title_romaji || ''}", Native: "${titles.title_native || ''}", Season: ${titles.season || ''}, Part: ${titles.part || ''}
Return ONLY valid JSON: {"title_english": "...", "title_romaji": "...", "title_native": "..."}`;

  const raw = await callAI(groqKey, geminiKey, prompt, 400);
  try {
    return extractJsonFromResponse(raw);
  } catch {
    return {};
  }
}

async function translateToIndonesian(groqKey: string | undefined, geminiKey: string | undefined, titles: TitleInput, mediaType: string) {
  const primarySource = titles.stored_title || titles.title_english || titles.title_romaji || '';
  if (!primarySource) return { title_indonesian: null };

  const isJapanese = mediaType === 'anime';
  const mediaLabel = isJapanese ? 'anime Jepang' : 'donghua China';

  const prompt = `Terjemahkan judul ${mediaLabel} ini ke Bahasa Indonesia yang natural.
Judul: "${primarySource}"
Info tambahan: English: "${titles.title_english || ''}", Romaji: "${titles.title_romaji || ''}", Native: "${titles.title_native || ''}", Season: ${titles.season || ''}, Part: ${titles.part || ''}
Aturan: "Season X" -> "Musim X", "Part X" -> "Bagian X". Pertahankan nama diri.
Jawab HANYA dengan judul terjemahannya saja.`;

  const result = await callAI(groqKey, geminiKey, prompt, 200);
  const cleaned = result.replace(/^["'`]+|["'`]+$/g, '').trim();
  return { title_indonesian: cleaned || null };
}

async function translateSynopsis(groqKey: string | undefined, geminiKey: string | undefined, text: string) {
  if (!text || text.trim().length === 0) return { translated: null };

  const prompt = `Terjemahkan teks berikut ke Bahasa Indonesia yang natural untuk konteks anime/donghua. Berikan HANYA terjemahannya saja.
Teks: ${text.trim()}`;

  const result = await callAI(groqKey, geminiKey, prompt, 1024);
  return { translated: result.trim() || null };
}

async function expandDonghuaQuery(groqKey: string | undefined, geminiKey: string | undefined, query: string) {
  if (!query || query.trim().length < 2) return { terms: [] };

  const prompt = `You are an expert on Chinese animated series (Donghua/Chinese anime).
The user is searching for a Donghua with this query: "${query.trim()}"

This could be a Chinese pinyin name, English title, abbreviation, partial title, or misspelled name.
Provide up to 5 alternative search terms that could help find this Donghua on MyAnimeList or AniList.
Include both the Chinese pinyin name and English name if known.

Respond ONLY with a JSON array of strings. Example: ["Battle Through the Heavens", "Dou Po Cangqiong", "Fights Break Sphere"]
If you do not know what this refers to, return: []`;

  const raw = await callAI(groqKey, geminiKey, prompt, 300);
  try {
    const parsed = extractJsonFromResponse(raw);
    if (!Array.isArray(parsed)) return { terms: [] };

    const terms = parsed
      .filter((term): term is string => typeof term === 'string')
      .map(term => term.trim())
      .filter(term => term.length >= 2);

    return { terms: [...new Set(terms)].slice(0, 5) };
  } catch {
    return { terms: [] };
  }
}
