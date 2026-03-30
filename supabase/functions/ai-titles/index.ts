import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'enrich_titles') {
      const { titles, mediaType } = body;
      const result = await enrichTitles(LOVABLE_API_KEY, titles, mediaType);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'translate_indonesian') {
      const { titles, mediaType } = body;
      const result = await translateToIndonesian(LOVABLE_API_KEY, titles, mediaType);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'translate_synopsis') {
      const { text } = body;
      const result = await translateSynopsis(LOVABLE_API_KEY, text);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('ai-titles error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function callAI(apiKey: string, prompt: string, maxTokens = 500): Promise<string> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limited, please try again later');
    if (response.status === 402) throw new Error('Credits exhausted');
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

interface TitleInput {
  stored_title?: string;
  title_english?: string;
  title_romaji?: string;
  title_native?: string;
  season?: number | null;
  part?: number | null;
}

async function enrichTitles(apiKey: string, titles: TitleInput, mediaType: string) {
  const mainTitle = titles.stored_title || titles.title_english || titles.title_romaji || '';
  if (!mainTitle) return {};

  const needEnglish = !titles.title_english;
  const needRomaji = !titles.title_romaji;
  const needNative = !titles.title_native;
  if (!needEnglish && !needRomaji && !needNative) return {};

  const isJapanese = mediaType === 'anime';
  const nativeScript = isJapanese ? 'Japanese Kanji/Kana' : 'Chinese Hanzi';
  const romajiType = isJapanese ? 'Romaji Hepburn' : 'Pinyin';

  const knownInfo = [
    titles.stored_title && `Stored title: "${titles.stored_title}"`,
    titles.title_english && `English: "${titles.title_english}"`,
    titles.title_romaji && `${isJapanese ? 'Romaji' : 'Pinyin'}: "${titles.title_romaji}"`,
    titles.title_native && `Native: "${titles.title_native}"`,
    titles.season && `Season: ${titles.season}`,
    titles.part && `Part: ${titles.part}`,
  ].filter(Boolean).join(', ');

  const fields: string[] = [];
  if (needEnglish) fields.push(`"title_english": "official English title"`);
  if (needRomaji) fields.push(`"title_romaji": "${romajiType} romanization"`);
  if (needNative) fields.push(`"title_native": "${nativeScript} script"`);

  const prompt = `You are an expert on ${isJapanese ? 'Japanese anime' : 'Chinese donghua'}.
Known: ${knownInfo}
Provide the missing title fields for this ${isJapanese ? 'anime' : 'donghua'}.
Return ONLY valid JSON (no markdown): {${fields.join(', ')}}`;

  const raw = await callAI(apiKey, prompt, 400);
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return {};
    return JSON.parse(raw.substring(start, end + 1));
  } catch {
    return {};
  }
}

async function translateToIndonesian(apiKey: string, titles: TitleInput, mediaType: string) {
  const storedTitle = titles.stored_title || '';
  const englishTitle = titles.title_english || '';
  const romajiTitle = titles.title_romaji || '';
  const primarySource = storedTitle || englishTitle || romajiTitle;
  if (!primarySource) return { title_indonesian: null };

  const isJapanese = mediaType === 'anime';
  const mediaLabel = isJapanese ? 'anime Jepang' : 'donghua China';

  const titleInfo = [
    storedTitle && `- Judul database: "${storedTitle}"`,
    englishTitle && `- Inggris: "${englishTitle}"`,
    romajiTitle && `- Romaji: "${romajiTitle}"`,
    titles.title_native && `- Native: "${titles.title_native}"`,
    titles.season && `- Season: ${titles.season}`,
    titles.part && `- Bagian: ${titles.part}`,
  ].filter(Boolean).join('\n');

  const prompt = `Terjemahkan judul ${mediaLabel} ini ke Bahasa Indonesia.
${titleInfo}

Aturan:
- "Season X" → "Musim X"
- "Part X" → "Bagian X"  
- Pertahankan nama diri/proper noun
- Terjemahkan frasa deskriptif

Jawab HANYA dengan judul terjemahannya saja.`;

  const result = await callAI(apiKey, prompt, 200);
  const cleaned = result
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(Terjemahan|Judul|Jawaban)[:\s-]+/i, '')
    .replace(/\n.*/s, '')
    .trim();

  if (!cleaned || cleaned.length < 1 || cleaned.length > 200) return { title_indonesian: null };
  return { title_indonesian: cleaned };
}

async function translateSynopsis(apiKey: string, text: string) {
  if (!text || text.trim().length === 0) return { translated: null };

  const prompt = `Kamu adalah penerjemah profesional. Terjemahkan teks berikut ke Bahasa Indonesia yang natural, mudah dipahami, dan sesuai konteks anime/donghua. Berikan HANYA terjemahannya saja tanpa penjelasan tambahan, tanpa tanda petik, dan tanpa awalan seperti "Terjemahan:" atau sejenisnya.

${text.trim()}`;

  const result = await callAI(apiKey, prompt, 1024);
  if (!result || result.trim().length === 0) return { translated: null };
  return { translated: result.trim() };
}
