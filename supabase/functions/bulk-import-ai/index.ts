import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Robust JSON extraction — handles markdown fences, trailing commas, control chars
 */
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

/**
 * Split text into chunks by line count
 */
function splitIntoChunks(text: string, maxLines = 25): string[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length <= maxLines) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    chunks.push(lines.slice(i, i + maxLines).join('\n'));
  }
  return chunks;
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
- is_favorite (boolean): default false
- is_bookmarked (boolean): default false
- is_movie (boolean): true ONLY if it's clearly a movie, not a series
- genre (string): Comma-separated genres ONLY if you are confident. Leave empty "" if unsure.
- parent_title (string): For season > 1, the base series title without season indicator. Empty for season 1.

Critical Rules:
1. PRESERVE original titles as closely as possible. Do NOT invent or guess titles.
2. For Excel/JSON input where data already has a "title" field, use it directly.
3. If the input is a prompt like "saya sudah nonton SAO season 4...", extract each distinct title mentioned.
4. For CSV/TSV with columns, map columns intelligently (first column is usually title).
5. Return ONLY valid JSON: {"items": [...]}. No markdown, no explanation, no extra text.
6. If a field like "No" or "id" appears, ignore it — it's a row number.

Example output: {"items": [{"title": "Sword Art Online", "season": 4, "cour": "", "rating": 9.5, "note": "*", "status": "completed", "is_favorite": false, "is_bookmarked": false, "is_movie": false, "genre": "", "parent_title": "Sword Art Online"}]}`;
}

/**
 * Call Groq API
 */
async function callGroq(apiKey: string, systemPrompt: string, userContent: string): Promise<any[]> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.05,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  const parsed = extractJsonFromResponse(content) as any;

  if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed)) return parsed;
  throw new Error('Invalid Groq response structure');
}

/**
 * Call Gemini API as fallback
 */
async function callGemini(apiKey: string, systemPrompt: string, userContent: string): Promise<any[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.05, maxOutputTokens: 8000 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  const parsed = extractJsonFromResponse(content) as any;

  if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed)) return parsed;
  throw new Error('Invalid Gemini response structure');
}

/**
 * Parse a single chunk with Groq → Gemini fallback
 */
async function parseChunk(
  chunk: string,
  systemPrompt: string,
  groqKey: string | undefined,
  geminiKey: string | undefined,
  chunkIdx: number,
  totalChunks: number,
): Promise<{ items: any[]; provider: string }> {
  const errors: string[] = [];

  // Try Groq first
  if (groqKey) {
    try {
      const items = await callGroq(groqKey, systemPrompt, chunk);
      console.log(`Chunk ${chunkIdx + 1}/${totalChunks}: Groq OK → ${items.length} items`);
      return { items, provider: 'groq' };
    } catch (e: any) {
      errors.push(`Groq: ${e.message}`);
      console.warn(`Chunk ${chunkIdx + 1}/${totalChunks}: Groq failed → ${e.message}`);
    }
  }

  // Fallback to Gemini
  if (geminiKey) {
    try {
      const items = await callGemini(geminiKey, systemPrompt, chunk);
      console.log(`Chunk ${chunkIdx + 1}/${totalChunks}: Gemini OK → ${items.length} items`);
      return { items, provider: 'gemini' };
    } catch (e: any) {
      errors.push(`Gemini: ${e.message}`);
      console.warn(`Chunk ${chunkIdx + 1}/${totalChunks}: Gemini failed → ${e.message}`);
    }
  }

  // If both fail, retry Groq with smaller chunk
  if (groqKey) {
    const halfLines = chunk.split('\n');
    const mid = Math.ceil(halfLines.length / 2);
    const firstHalf = halfLines.slice(0, mid).join('\n');
    const secondHalf = halfLines.slice(mid).join('\n');

    const results: any[] = [];
    for (const subChunk of [firstHalf, secondHalf]) {
      if (!subChunk.trim()) continue;
      try {
        const items = await callGroq(groqKey, systemPrompt, subChunk);
        results.push(...items);
      } catch (e: any) {
        // Last resort: try Gemini with sub-chunk
        if (geminiKey) {
          try {
            const items = await callGemini(geminiKey, systemPrompt, subChunk);
            results.push(...items);
          } catch {}
        }
      }
    }
    if (results.length > 0) {
      console.log(`Chunk ${chunkIdx + 1}/${totalChunks}: Split retry OK → ${results.length} items`);
      return { items: results, provider: 'split-retry' };
    }
  }

  throw new Error(`All AI providers failed for chunk ${chunkIdx + 1}: ${errors.join('; ')}`);
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
    
    // Split into chunks of ~25 lines to stay within token limits
    const chunks = splitIntoChunks(text.trim(), 25);
    const allItems: unknown[] = [];
    const chunkResults: { chunkIdx: number; provider: string; count: number }[] = [];

    // Process chunks sequentially to avoid rate limits
    for (let i = 0; i < chunks.length; i++) {
      // Add delay between chunks to respect rate limits (skip first)
      if (i > 0) {
        await new Promise(r => setTimeout(r, 1500));
      }

      const result = await parseChunk(chunks[i], systemPrompt, GROQ_API_KEY, GEMINI_API_KEY, i, chunks.length);
      allItems.push(...result.items);
      chunkResults.push({ chunkIdx: i, provider: result.provider, count: result.items.length });
    }

    console.log(`Total: ${allItems.length} items from ${chunks.length} chunks`, JSON.stringify(chunkResults));

    return new Response(
      JSON.stringify({ items: allItems, meta: { chunks: chunks.length, results: chunkResults } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Bulk import AI error:', errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
