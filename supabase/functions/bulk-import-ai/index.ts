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
    // Fix common AI JSON issues
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
 * Split large text into chunks for Groq token limit
 */
function splitIntoChunks(text: string, maxChars = 12000): string[] {
  if (text.length <= maxChars) return [text];

  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';

  for (const line of lines) {
    if (current.length + line.length + 1 > maxChars && current.length > 0) {
      chunks.push(current);
      current = '';
    }
    current += (current ? '\n' : '') + line;
  }
  if (current) chunks.push(current);
  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: verify user from authorization header
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
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured in Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a data parser for an ${mediaType} tracking app called LIVORIA.

Your task: Parse the user's unstructured text into a structured JSON array of ${mediaType} entries.
The input can be ANY format: plain text, CSV, TSV, JSON, Excel-pasted JSON array, long prompt, or messy unstructured text.

Each entry must have these fields:
- title (string): The EXACT ${mediaType} title in its most well-known form, properly capitalized. Use the official/canonical name. Do NOT alter or mistranslate the title. If the input says "Maou Gakuin" output "Maou Gakuin no Futekigousha" or keep as-is if unsure.
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

    // Split large inputs into chunks
    const chunks = splitIntoChunks(text.trim(), 12000);
    const allItems: unknown[] = [];

    for (const chunk of chunks) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: chunk },
          ],
          temperature: 0.05,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit Groq tercapai, coba lagi nanti.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();

      // Check for truncation
      const finishReason = data.choices?.[0]?.finish_reason;
      if (finishReason === 'length') {
        console.warn('Groq response truncated (max_tokens reached)');
      }

      const content = data.choices?.[0]?.message?.content?.trim() || '';
      const parsed = extractJsonFromResponse(content) as any;

      if (parsed?.items && Array.isArray(parsed.items)) {
        allItems.push(...parsed.items);
      } else if (Array.isArray(parsed)) {
        allItems.push(...parsed);
      }
    }

    return new Response(
      JSON.stringify({ items: allItems }),
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
