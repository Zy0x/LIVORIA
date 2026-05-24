import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = resolve(import.meta.dirname, '../../../.env');
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...parts] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = parts.join('=').replace(/^["']|["']$/g, '');
  }
}

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function parseArgs() {
  return {
    limit: Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 80),
    media: process.argv.find((arg) => arg.startsWith('--media='))?.split('=')[1] || 'all',
  };
}

function parseAlternativeTitles(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function compactObject(value) {
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry == null) continue;
    if (typeof entry === 'string' && !entry.trim()) continue;
    if (Array.isArray(entry) && entry.length === 0) continue;
    output[key] = entry;
  }
  return output;
}

function isAsciiOnly(text) {
  return /^[\x00-\x7F\s.,:;!?'"()\-–—&/0-9A-Za-z]+$/.test(text);
}

function isLikelyEnglishText(text) {
  if (!text || text.trim().length < 30) return false;
  const value = text.toLowerCase();
  const englishHits = [
    /\bthe\b/, /\band\b/, /\bthat\b/, /\bwith\b/, /\bfrom\b/, /\binto\b/,
    /\btheir\b/, /\bwhen\b/, /\bafter\b/, /\bbecause\b/, /\bmust\b/, /\bwill\b/,
  ].filter((pattern) => pattern.test(value)).length;
  const indonesianHits = [
    /\byang\b/, /\bdan\b/, /\bdengan\b/, /\buntuk\b/, /\bdalam\b/, /\bsetelah\b/,
    /\bkarena\b/, /\bmereka\b/, /\bsebagai\b/, /\bharus\b/, /\bakan\b/,
  ].filter((pattern) => pattern.test(value)).length;
  return englishHits >= 2 && englishHits > indonesianHits;
}

async function translateToIndonesian(text) {
  const source = clean(text);
  if (!source) return '';
  const chunks = source.match(/[\s\S]{1,450}(?=\s|$)/g) || [source];
  const translated = [];

  for (const chunk of chunks) {
    let translatedChunk = '';
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|id`;
    const myMemoryResponse = await fetch(myMemoryUrl);
    if (myMemoryResponse.ok) {
      const data = await myMemoryResponse.json();
      translatedChunk = clean(data?.responseData?.translatedText);
    }

    if (!translatedChunk) {
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=${encodeURIComponent(chunk)}`;
      const googleResponse = await fetch(googleUrl);
      if (!googleResponse.ok) throw new Error(`Translation failed: ${googleResponse.status}`);
      const data = await googleResponse.json();
      translatedChunk = Array.isArray(data?.[0])
        ? data[0].map((part) => part?.[0] || '').join('')
        : '';
    }

    translated.push(translatedChunk || chunk);
    await sleep(250);
  }

  return translated.join(' ').replace(/\s+/g, ' ').trim();
}

async function fetchJikanTitles(row) {
  const endpoint = row.mal_id
    ? `https://api.jikan.moe/v4/anime/${row.mal_id}`
    : `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(row.title)}&limit=1&sfw=false`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) return {};
    const json = await response.json();
    const item = row.mal_id ? json.data : json.data?.[0];
    if (!item) return {};
    return {
      title_english: clean(item.title_english),
      title_romaji: clean(item.title),
      title_native: clean(item.title_japanese),
      title_mal: clean(item.title),
      synonyms: Array.isArray(item.title_synonyms) ? item.title_synonyms.filter(Boolean) : [],
    };
  } catch {
    return {};
  }
}

async function fetchAniListTitles(row) {
  const query = row.anilist_id
    ? `query($id:Int){Media(id:$id,type:ANIME){title{romaji english native}synonyms}}`
    : `query($s:String){Media(search:$s,type:ANIME,sort:SEARCH_MATCH){title{romaji english native}synonyms}}`;
  const variables = row.anilist_id ? { id: row.anilist_id } : { s: row.title };

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) return {};
    const json = await response.json();
    const media = json.data?.Media;
    if (!media) return {};
    return {
      title_english: clean(media.title?.english),
      title_romaji: clean(media.title?.romaji),
      title_native: clean(media.title?.native),
      title_anilist: clean(media.title?.romaji),
      synonyms: Array.isArray(media.synonyms) ? media.synonyms.filter(Boolean) : [],
    };
  } catch {
    return {};
  }
}

function needsTitleRepair(alt, media) {
  const english = clean(alt.title_english);
  const romaji = clean(alt.title_romaji);
  const native = clean(alt.title_native);
  const indonesian = clean(alt.title_indonesian);
  if (!romaji || !native || !indonesian) return true;
  if (english && (romaji === english || native === english)) return true;
  return native && (media === 'anime' || media === 'donghua') && isAsciiOnly(native);
}

async function normalizeTitles(row, media) {
  const alt = parseAlternativeTitles(row.alternative_titles);
  if (!needsTitleRepair(alt, media)) return null;

  const [jikan, anilist] = await Promise.all([fetchJikanTitles(row), fetchAniListTitles(row)]);
  const next = {
    ...alt,
    stored_title: clean(alt.stored_title) || row.title,
    title_english: clean(alt.title_english) || clean(anilist.title_english) || clean(jikan.title_english),
    title_romaji: clean(alt.title_romaji) || clean(anilist.title_romaji) || clean(jikan.title_romaji),
    title_native: clean(alt.title_native) || clean(anilist.title_native) || clean(jikan.title_native),
    title_mal: clean(alt.title_mal) || clean(jikan.title_mal),
    title_anilist: clean(alt.title_anilist) || clean(anilist.title_anilist),
  };

  if (next.title_english && next.title_romaji === next.title_english) {
    next.title_romaji = clean(anilist.title_romaji) || clean(jikan.title_romaji) || next.title_romaji;
  }
  if (next.title_english && next.title_native === next.title_english) {
    next.title_native = clean(anilist.title_native) || clean(jikan.title_native) || '';
  }
  if (next.title_native && isAsciiOnly(next.title_native)) {
    const nativeCandidate = clean(anilist.title_native) || clean(jikan.title_native);
    if (nativeCandidate && !isAsciiOnly(nativeCandidate)) next.title_native = nativeCandidate;
  }

  if (!clean(next.title_indonesian)) {
    const source = clean(next.title_english) || row.title;
    next.title_indonesian = await translateToIndonesian(source);
  }

  const synonyms = [
    ...(Array.isArray(alt.synonyms) ? alt.synonyms : []),
    ...(Array.isArray(jikan.synonyms) ? jikan.synonyms : []),
    ...(Array.isArray(anilist.synonyms) ? anilist.synonyms : []),
  ].map(clean).filter(Boolean);
  next.synonyms = [...new Set(synonyms)];

  const serialized = JSON.stringify(compactObject(next));
  return serialized === (row.alternative_titles || '') ? null : serialized;
}

async function normalizeTable(client, table, limit) {
  const { data, error } = await client
    .from(table)
    .select('id,title,synopsis,alternative_titles,mal_id,anilist_id')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;

  const summary = { scanned: 0, updated: 0, failed: 0 };
  for (const row of data || []) {
    summary.scanned += 1;
    const update = {};
    try {
      if (isLikelyEnglishText(row.synopsis)) {
        const translatedSynopsis = await translateToIndonesian(row.synopsis);
        if (translatedSynopsis && translatedSynopsis !== row.synopsis) update.synopsis = translatedSynopsis;
      }

      const normalizedTitles = await normalizeTitles(row, table);
      if (normalizedTitles) update.alternative_titles = normalizedTitles;

      if (Object.keys(update).length > 0) {
        const { error: updateError } = await client.from(table).update(update).eq('id', row.id);
        if (updateError) throw updateError;
        summary.updated += 1;
      }
      await sleep(350);
    } catch (error) {
      summary.failed += 1;
      console.warn(`${table}/${row.id} failed:`, error.message || error);
    }
  }
  return summary;
}

loadEnv();
const { limit, media } = parseArgs();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const client = createClient(supabaseUrl, supabaseServiceRoleKey);
const tables = media === 'anime' || media === 'donghua' ? [media] : ['anime', 'donghua'];
const totals = {};

for (const table of tables) {
  totals[table] = await normalizeTable(client, table, limit);
  console.log(`${table}`, JSON.stringify(totals[table]));
}

console.log('total', JSON.stringify(totals));
