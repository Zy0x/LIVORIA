import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileUp, FileSpreadsheet, Send, CheckCircle2, AlertTriangle, 
  HelpCircle, Loader2, X, Trash2, Search, Edit2, 
  ExternalLink, ArrowRight, History, Info, Sparkles, ChevronDown, ChevronUp, MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { fetchAlternativeTitles, serializeAlternativeTitles } from "@/hooks/useAlternativeTitles";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BulkItem {
  title: string;
  season: number;
  cour: string;
  rating: number;
  note: string;
  status: 'on-going' | 'completed' | 'planned';
  is_favorite: boolean;
  is_bookmarked: boolean;
  is_movie: boolean;
  genre: string;
  parent_title: string;
  // AI/Search fields
  originalTitle?: string;
  candidates?: SearchCandidate[];
  enriched?: boolean;
  enrichSource?: string;
  matchConfidence?: 'high' | 'medium' | 'low' | 'none';
  matchScore?: number;
  cover_url?: string;
  synopsis?: string;
  studio?: string;
  release_year?: number | null;
  episodes?: number;
  mal_id?: number | null;
  anilist_id?: number | null;
  mal_url?: string;
  anilist_url?: string;
  duration_minutes?: number | null;
  // Internal tracking
  watch_status?: 'none' | 'watching' | 'completed' | 'on_hold' | 'dropped' | 'planned';
  watched_at?: string | null;
  alternative_titles?: string;
}

interface SearchCandidate {
  source: 'anilist' | 'jikan';
  anilist_id: number | null;
  mal_id: number | null;
  title: string;
  title_english?: string;
  title_native?: string;
  cover_url: string;
  year: number | null;
  episodes: number | null;
  score: number | null;
  is_movie: boolean;
  similarity: number;
  detectedSeason?: number | null;
  _al?: any; // Raw AniList data
  _jk?: any; // Raw Jikan data
}

interface LogEntry {
  message: string;
  type: 'info' | 'ok' | 'err' | 'skip';
  time: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Similarity & Normalization
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTitle(t: string): string {
  return t.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(s1: string, s2: string): number {
  const n1 = normalizeTitle(s1);
  const n2 = normalizeTitle(s2);
  if (n1 === n2) return 1.0;
  if (!n1 || !n2) return 0;

  const pairs = (s: string) => {
    const res = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) res.add(s.substring(i, i + 2));
    return res;
  };

  const p1 = pairs(n1);
  const p2 = pairs(n2);
  let intersect = 0;
  for (const p of p1) if (p2.has(p)) intersect++;
  return (2.0 * intersect) / (p1.size + p2.size);
}

function detectCandidateSeason(title: string): number | null {
  const m = title.match(/(?:season|s)\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  const m2 = title.match(/\s+(\d+)$/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function calculateSeasonPenalty(candidateSeason: number | null, targetSeason: number): number {
  if (targetSeason <= 1 && !candidateSeason) return 0;
  if (candidateSeason === targetSeason) return 0;
  if (!candidateSeason && targetSeason > 1) return 0.15;
  return 0.4; // Strong penalty for mismatch
}

function scoreToConfidence(score: number): BulkItem['matchConfidence'] {
  if (score >= 0.85) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.15) return 'low';
  return 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// Title Extractors
// ─────────────────────────────────────────────────────────────────────────────

function extractCourFromTitle(title: string): string {
  const m = title.match(/(?:part|cour)\s*(\d+)/i);
  return m ? `Part ${m[1]}` : '';
}

function extractSeasonFromTitle(title: string): number | null {
  const m = title.match(/(?:season|s)\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractBaseTitleFromApiTitle(title: string): string {
  return title
    .replace(/\s+(season|s)\s*\d+/gi, '')
    .replace(/\s+(part|cour)\s*\d+/gi, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s+(II|III|IV|VI|VII|VIII|IX|X)$/i, '')
    .trim();
}

function getParentTitle(title: string, season: number): string {
  if (season <= 1) return '';
  return extractBaseTitleFromApiTitle(title);
}

// ─────────────────────────────────────────────────────────────────────────────
// AniList GQL query
// ─────────────────────────────────────────────────────────────────────────────

const ANILIST_GQL = `query($s:String){Page(page:1,perPage:8){media(search:$s,type:ANIME){
  id title{romaji english native}synonyms
  coverImage{extraLarge large}
  startDate{year}
  studios(isMain:true){nodes{name}}
  siteUrl episodes status
  description(asHtml:false)
  genres format duration averageScore
}}}`;

// ─────────────────────────────────────────────────────────────────────────────
// Core Search Logic
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCandidates(query: string, baseTitle: string): Promise<SearchCandidate[]> {
  const raw: SearchCandidate[] = [];

  await Promise.allSettled([
    (async () => {
      try {
        const r = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: ANILIST_GQL, variables: { s: query } }),
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json();
        for (const m of (d.data?.Page?.media || [])) {
          const titles = [m.title?.romaji, m.title?.english, m.title?.native, ...(m.synonyms||[])].filter(Boolean);
          const sim = Math.max(...titles.map((t: string) => similarity(baseTitle, t)));
          const apiTitle = m.title?.english || m.title?.romaji || '';
          raw.push({
            source: 'anilist',
            anilist_id: m.id,
            mal_id: null,
            title: apiTitle,
            title_english: m.title?.english || '',
            title_native: m.title?.native || '',
            cover_url: m.coverImage?.extraLarge || m.coverImage?.large || '',
            year: m.startDate?.year || null,
            episodes: m.episodes || null,
            score: m.averageScore ? m.averageScore / 10 : null,
            is_movie: m.format === 'MOVIE',
            similarity: sim,
            detectedSeason: detectCandidateSeason(apiTitle),
            _al: m,
            _jk: null,
          });
        }
      } catch {}
    })(),

    (async () => {
      try {
        const j = await fetchWithRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=8`);
        for (const item of (j?.data || [])) {
          const titles = [
            item.title, item.title_english, item.title_japanese,
            ...(item.title_synonyms||[]),
            ...(item.titles||[]).map((t: any) => t.title),
          ].filter(Boolean);
          const sim = Math.max(...titles.map((t: string) => similarity(baseTitle, t)));
          const apiTitle = item.title_english || item.title || '';
          raw.push({
            source: 'jikan',
            mal_id: item.mal_id,
            anilist_id: null,
            title: apiTitle,
            title_native: item.title_japanese || '',
            cover_url: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
            year: item.year || item.aired?.prop?.from?.year || null,
            episodes: item.episodes || null,
            score: item.score || null,
            is_movie: item.type === 'Movie',
            similarity: sim,
            detectedSeason: detectCandidateSeason(apiTitle),
            _al: null,
            _jk: item,
          });
        }
      } catch {}
    })(),
  ]);

  const seen = new Set<string>();
  const unique: SearchCandidate[] = [];
  for (const c of raw) {
    const k = `${c.source}-${c.anilist_id ?? ''}-${c.mal_id ?? ''}-${normalizeTitle(c.title)}`;
    if (!seen.has(k)) { seen.add(k); unique.push(c); }
  }
  return unique.sort((a, b) => b.similarity - a.similarity);
}

async function searchWithAccuracy(title: string, season: number): Promise<SearchCandidate[]> {
  const variants = buildQueryVariants(title, season);
  const allResults = await Promise.all(
    variants.map(q => fetchCandidates(q, title))
  );
  const seen = new Set<string>();
  const unique: SearchCandidate[] = [];
  for (const batch of allResults) {
    for (const c of batch) {
      const k = `${c.source}-${c.anilist_id ?? ''}-${c.mal_id ?? ''}-${normalizeTitle(c.title)}`;
      if (!seen.has(k)) { seen.add(k); unique.push(c); }
    }
  }
  const withPenalty = unique.map(c => {
    const penalty = calculateSeasonPenalty(c.detectedSeason ?? null, season);
    return { ...c, _adjustedScore: Math.max(0, c.similarity - penalty) };
  });
  withPenalty.sort((a, b) => (b as any)._adjustedScore - (a as any)._adjustedScore);
  const result = withPenalty.map(c => ({ ...c, similarity: (c as any)._adjustedScore }));
  return result.slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function nowTime() {
  const n = new Date();
  return `${n.getHours().toString().padStart(2,'0')}:${n.getMinutes().toString().padStart(2,'0')}:${n.getSeconds().toString().padStart(2,'0')}`;
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 1; i <= retries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (r.status === 429) { await sleep(2500 * i); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch(e) { if (i === retries) throw e; await sleep(1500 * i); }
  }
}

function mapStatus(s?: string): 'on-going' | 'completed' | 'planned' | null {
  if (!s) return null;
  const l = s.toLowerCase().replace(/_/g,' ').trim();
  if (l.includes('releasing') || (l.includes('airing') && !l.includes('finished'))) return 'on-going';
  if (l.includes('finished') || l === 'completed' || l === 'cancelled') return 'completed';
  if (l.includes('not yet') || l === 'upcoming' || l === 'hiatus') return 'planned';
  return null;
}

function buildQueryVariants(title: string, season: number): string[] {
  const v = new Set<string>();
  const base = title
    .replace(/\s+(season|s)\s*\d+/gi, '')
    .replace(/\s+(part|cour)\s*\d+/gi, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s+(II|III|IV|VI|VII|VIII|IX|X)$/i, '')
    .trim();
  const cleanBase = base || title.trim();
  v.add(cleanBase);
  if (season > 1 && cleanBase) {
    v.add(`${cleanBase} season ${season}`);
    v.add(`${cleanBase} ${season}`);
  }
  return [...v].filter(x => x.length >= 2).slice(0, 3);
}

function interpretNote(note: string): { is_favorite: boolean; is_bookmarked: boolean } {
  const n = (note || '').trim();
  if (n === '**') return { is_favorite: false, is_bookmarked: true };
  if (n === 'OP') return { is_favorite: true, is_bookmarked: false };
  if (n === '*') return { is_favorite: true, is_bookmarked: true };
  
  const hasDoubleStar = n.includes('**');
  const hasSingleStar = n.includes('*') && !hasDoubleStar;
  const hasOP = /\bOP\b/.test(n);

  if (hasSingleStar) return { is_favorite: true, is_bookmarked: true };
  if (hasDoubleStar) return { is_favorite: false, is_bookmarked: true };
  if (hasOP) return { is_favorite: true, is_bookmarked: false };

  if (n === 'Sad' || n === 'Romance') return { is_favorite: true, is_bookmarked: true };
  
  return { is_favorite: false, is_bookmarked: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function BulkImportDialog({ 
  open, onOpenChange, onImport, mediaType = 'anime', defaultStatus = 'completed'
}: { 
  open: boolean; onOpenChange: (o: boolean) => void; 
  onImport: (items: BulkItem[]) => void;
  mediaType?: 'anime' | 'donghua';
  defaultStatus?: 'on-going' | 'completed' | 'planned';
}) {
  const { toast } = useToast();
  const { session, SUPABASE_URL, SUPABASE_ANON_KEY } = useAuth();

  const [step, setStep] = useState<'input' | 'processing' | 'enriching' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<BulkItem[]>([]);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0, provider: '', model: '', itemsSoFar: 0, status: 'idle' as 'idle' | 'processing' | 'success' | 'error' });
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, ok: 0, skip: 0, err: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pickerLoading, setPickerLoading] = useState<number | null>(null);
  const [editingTitleIdx, setEditingTitleIdx] = useState<number | null>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ message, type, time: nowTime() }, ...prev].slice(0, 100));
  };

  const reset = () => {
    setStep('input'); setRawText(''); setParsedItems([]); 
    setRunning(false); runningRef.current = false;
    setAiProgress({ current: 0, total: 0, provider: '', model: '', itemsSoFar: 0, status: 'idle' });
    setImportProgress({ current: 0, total: 0, ok: 0, skip: 0, err: 0 });
    setLogs([]);
  };

  // ── AI Parser ──────────────────────────────────────────────────────────────

  const handleAiParse = async () => {
    if (!rawText.trim()) return;
    setStep('processing');
    setAiProgress({ current: 0, total: 0, provider: 'Menyiapkan...', model: '', itemsSoFar: 0, status: 'processing' });

    try {
      const splitIntoChunks = (text: string, maxLines = 60): string[] => {
        const lines = text.split('\n').filter(l => l.trim());
        const chunks: string[] = [];
        for (let i = 0; i < lines.length; i += maxLines) {
          chunks.push(lines.slice(i, i + maxLines).join('\n'));
        }
        return chunks;
      };

      const processChunk = async (chunkText: string) => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/bulk-import-ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text: chunkText, mediaType, defaultStatus }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'AI Error');
        return data;
      };

      const chunks = splitIntoChunks(rawText.trim(), 60);
      const allItems: any[] = [];
      setAiProgress({ current: 0, total: chunks.length, provider: 'Memulai Racing...', model: 'Semua Model', itemsSoFar: 0, status: 'processing' });

      const chunkResults: { index: number; items: any[]; provider: string; model: string }[] = [];
      
      await Promise.all(chunks.map(async (chunk, index) => {
        const runProcess = async (isRetry = false) => {
          try {
            if (isRetry) await new Promise(r => setTimeout(r, 1000));
            const result = await processChunk(chunk);
            chunkResults.push({ index, items: result.items || [], provider: result.provider, model: result.model });
            
            setAiProgress(p => ({
              ...p,
              current: p.current + 1,
              provider: result.provider,
              model: result.model,
              itemsSoFar: chunkResults.reduce((acc, curr) => acc + curr.items.length, 0),
              status: 'success'
            }));
          } catch (err: any) {
            console.error(`Chunk ${index} failed:`, err);
            if (!isRetry) {
              await runProcess(true);
            } else {
              chunkResults.push({ index, items: [], provider: 'Failed', model: 'Failed' });
            }
          }
        };
        await runProcess();
      }));

      chunkResults.sort((a, b) => a.index - b.index);
      chunkResults.forEach(res => allItems.push(...res.items));

      if (!allItems.length) throw new Error('Tidak ada data yang berhasil diparsing');
      setParsedItems(parseHtmlStyleJSON(allItems));
      setStep('preview');
    } catch (error: any) {
      toast({ title: 'AI Parsing Gagal', description: error.message, variant: 'destructive' });
      setStep('input');
    }
  };

  const parseHtmlStyleJSON = (items: any[]): BulkItem[] => {
    return items.map(item => {
      const { is_favorite, is_bookmarked } = interpretNote(item.note);
      return {
        title: item.title || '',
        season: item.season || 1,
        cour: item.cour || '',
        rating: item.rating || 0,
        note: item.note || '',
        status: item.status || defaultStatus,
        is_favorite: item.is_favorite ?? is_favorite,
        is_bookmarked: item.is_bookmarked ?? is_bookmarked,
        is_movie: item.is_movie || false,
        genre: item.genre || '',
        parent_title: item.parent_title || '',
        originalTitle: item.title,
      };
    });
  };

  // ── Autofill Logic (Optimized) ──────────────────────────────────────────────

  const applyCandidate = useCallback(async (idx: number, candidate: SearchCandidate, currentParsedItems: BulkItem[]) => {
    const item = currentParsedItems[idx];
    if (!item) return null;

    let finalCandidate = { ...candidate };
    
    // Cross-link sources if missing
    if (candidate.source === 'anilist' && !candidate._jk) {
      try {
        const jRes = await fetchWithRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(candidate.title_english || candidate.title)}&limit=3`);
        if (jRes?.data?.[0]) finalCandidate._jk = jRes.data[0];
      } catch {}
    } else if (candidate.source === 'jikan' && !candidate._al) {
      try {
        const r = await fetch('https://graphql.anilist.co', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: ANILIST_GQL, variables: { s: candidate.title } }),
        });
        const d = await r.json();
        if (d.data?.Page?.media?.[0]) finalCandidate._al = d.data.Page.media[0];
      } catch {}
    }

    const enriched = await candidateToEnrichment(finalCandidate, item, mediaType);
    
    try {
      const alt = await fetchAlternativeTitles({
        malId: enriched.mal_id, anilistId: enriched.anilist_id,
        storedTitle: enriched.title || item.title, mediaType,
      });
      if (alt) enriched.alternative_titles = serializeAlternativeTitles(alt);
    } catch {}

    return {
      ...item,
      ...enriched,
      candidates: item.candidates,
      originalTitle: item.originalTitle || item.title,
      watch_status: item.watch_status || 'none',
      watched_at: item.watched_at || null,
    };
  }, [mediaType]);

  const enrichAllItems = async () => {
    setStep('enriching'); setRunning(true); runningRef.current = true; setLogs([]);
    const total = parsedItems.length;
    setImportProgress({ current: 0, total, ok: 0, skip: 0, err: 0 });
    addLog(`🚀 Auto-fill ${total} ${mediaType} — parallel batching enabled`, 'info');

    const updatedItems = [...parsedItems];
    let ok = 0, skip = 0, err = 0;

    // Process in batches to balance speed and rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (!runningRef.current) break;

      const batchIndices = Array.from({ length: Math.min(BATCH_SIZE, total - i) }, (_, k) => i + k);
      
      await Promise.all(batchIndices.map(async (idx) => {
        if (!runningRef.current) return;
        
        const item = updatedItems[idx];
        if (item.enriched && item.enrichSource === 'Import') {
          ok++;
          return;
        }

        try {
          // 1. Search with improved accuracy
          const candidates = await searchWithAccuracy(item.title, item.season);
          const best = candidates[0];
          const bestScore = best?.similarity || 0;

          if (!best || bestScore < 0.15) {
            addLog(`[${idx+1}] ⚠ Tidak cocok: "${item.title}"`, 'skip');
            updatedItems[idx] = { ...item, candidates, matchConfidence: 'none', matchScore: 0 };
            skip++;
          } else {
            // 2. Auto-apply best candidate
            const enrichedItem = await applyCandidate(idx, best, updatedItems);
            if (enrichedItem) {
              updatedItems[idx] = enrichedItem;
              updatedItems[idx].candidates = candidates;
              addLog(`[${idx+1}] ✓ ${enrichedItem.title}`, 'ok');
              ok++;
            } else {
              err++;
            }
          }
        } catch (e: any) {
          addLog(`[${idx+1}] ✖ Error: ${item.title} (${e.message})`, 'err');
          err++;
        }
        
        setImportProgress(p => ({ ...p, current: p.current + 1, ok, skip, err }));
      }));

      // Small delay between batches to avoid aggressive rate limiting
      if (i + BATCH_SIZE < total) await sleep(800);
    }

    setParsedItems(updatedItems);
    setRunning(false); runningRef.current = false;
    setStep('preview');
    toast({ title: 'Auto-fill Selesai', description: `Berhasil: ${ok}, Gagal/Skip: ${skip + err}` });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0 border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        
        {/* Header */}
        <div className="p-6 border-b bg-muted/30">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileUp className="w-5 h-5" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">Bulk Import {mediaType === 'donghua' ? 'Donghua' : 'Anime'}</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Gunakan AI untuk memproses teks berantakan atau daftar manual menjadi data terstruktur.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 'input' && (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Tempel Daftar atau Teks Disini
                  </Label>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">AI Powered</span>
                </div>
                <Textarea 
                  placeholder="Contoh:&#10;1. Solo Leveling *&#10;2. One Piece S2 **&#10;3. Frieren OP"
                  className="min-h-[300px] font-mono text-sm resize-none bg-muted/20 border-muted-foreground/10 focus:border-primary/30 transition-all"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-8 animate-in zoom-in-95 duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <Loader2 className="w-16 h-16 text-primary animate-spin relative" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h3 className="text-xl font-bold tracking-tight">AI Sedang Bekerja...</h3>
                <p className="text-sm text-muted-foreground">Menganalisis teks Anda menggunakan model bahasa tingkat tinggi untuk ekstraksi data yang akurat.</p>
              </div>
              <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Progres Parsing</span>
                  <span>{Math.round((aiProgress.current / (aiProgress.total || 1)) * 100)}%</span>
                </div>
                <Progress value={(aiProgress.current / (aiProgress.total || 1)) * 100} className="h-1.5" />
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border border-primary/5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Provider Aktif</span>
                    <span className="text-xs font-semibold text-primary">{aiProgress.provider || 'Menghubungkan...'}</span>
                  </div>
                  <div className="text-right flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Data Ditemukan</span>
                    <span className="text-xs font-bold">{aiProgress.itemsSoFar} Items</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'enriching' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 border-b bg-muted/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Auto-fill & Sinkronisasi</h3>
                    <p className="text-xs text-muted-foreground">Mencari metadata akurat dari AniList & MyAnimeList secara paralel.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { runningRef.current = false; setRunning(false); }} className="h-8 text-xs border-red-500/20 text-red-500 hover:bg-red-500/10">
                    Hentikan
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span className="text-primary">Mencari Metadata...</span>
                    <span>{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <Progress value={(importProgress.current / importProgress.total) * 100} className="h-1.5" />
                </div>
              </div>
              <ScrollArea className="flex-1 p-4 bg-black/5 dark:bg-white/5">
                <div className="space-y-1 font-mono text-[11px]">
                  {logs.map((log, i) => (
                    <div key={i} className={`flex gap-2 py-1 px-2 rounded hover:bg-muted/50 transition-colors ${
                      log.type === 'ok' ? 'text-emerald-500' : 
                      log.type === 'err' ? 'text-red-500' : 
                      log.type === 'skip' ? 'text-amber-500' : 'text-muted-foreground'
                    }`}>
                      <span className="opacity-30 shrink-0">[{log.time}]</span>
                      <span className="break-words">{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
              <div className="p-4 border-b flex items-center justify-between bg-background">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="rounded-md px-2 py-1 font-mono text-xs bg-primary/5 text-primary border-primary/20">
                    {parsedItems.length} ITEMS READY
                  </Badge>
                  <div className="h-4 w-px bg-border" />
                  <p className="text-xs text-muted-foreground hidden sm:block">Periksa kembali data sebelum menyimpan ke koleksi.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={enrichAllItems} className="h-8 gap-2 text-xs hover:bg-primary/10 hover:text-primary">
                  <Sparkles className="w-3 h-3" />
                  Re-run Auto-fill
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {parsedItems.map((item, idx) => (
                    <div key={idx} className="group relative bg-background border rounded-xl p-4 hover:shadow-md transition-all duration-200 border-muted-foreground/10 hover:border-primary/20">
                      <div className="flex gap-4">
                        <div className="w-16 h-24 rounded-lg bg-muted shrink-0 overflow-hidden border shadow-inner">
                          {item.cover_url ? (
                            <img src={item.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                              <History className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm truncate leading-tight group-hover:text-primary transition-colors">{item.title}</h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <span className="opacity-50">Original:</span> {item.originalTitle || item.title}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                              <ConfidenceBadge confidence={item.matchConfidence} score={item.matchScore} />
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => setParsedItems(p => p.filter((_, i) => i !== idx))}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {item.season > 1 && <Badge variant="secondary" className="text-[9px] h-5">Season {item.season}</Badge>}
                            {item.is_movie && <Badge variant="outline" className="text-[9px] h-5 border-amber-500/30 text-amber-500 bg-amber-500/5">Movie</Badge>}
                            {item.rating > 0 && (
                              <Badge variant="outline" className="text-[9px] h-5 border-yellow-500/30 text-yellow-500 bg-yellow-500/5 flex gap-1 items-center">
                                ★ {item.rating}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-[9px] h-5 ${
                              item.status === 'completed' ? 'border-emerald-500/30 text-emerald-500' :
                              item.status === 'on-going' ? 'border-blue-500/30 text-blue-500' : 'border-slate-500/30 text-slate-500'
                            }`}>
                              {item.status.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-1">
                            {item.genre && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px] italic">
                                {item.genre}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/30">
          <DialogFooter className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {step !== 'input' && (
                <Button variant="ghost" onClick={reset} disabled={running} className="h-10 text-xs gap-2">
                  <Trash2 className="w-4 h-4" /> Reset
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <DialogClose asChild>
                <Button variant="outline" className="h-10 text-xs px-6">Batal</Button>
              </DialogClose>
              
              {step === 'input' && (
                <Button 
                  onClick={handleAiParse} 
                  disabled={!rawText.trim()} 
                  className="h-10 text-xs px-8 gap-2 shadow-lg shadow-primary/20 group"
                >
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" /> 
                  Ekstrak dengan AI
                </Button>
              )}
              
              {step === 'preview' && (
                <Button 
                  onClick={() => onImport(parsedItems)} 
                  disabled={!parsedItems.length} 
                  className="h-10 text-xs px-8 gap-2 shadow-lg shadow-primary/20"
                >
                  <Send className="w-4 h-4" /> Simpan {parsedItems.length} Data
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Sub-components
// ─────────────────────────────────────────────────────────────────────────────

async function candidateToEnrichment(
  c: SearchCandidate,
  original: BulkItem,
  mediaType: 'anime' | 'donghua' = 'anime'
): Promise<Partial<BulkItem>> {
  const al = c._al;
  const jk = c._jk;

  const bestTitle = (al?.title?.english || al?.title?.romaji) || (jk?.title_english || jk?.title) || original.title;
  const cover = al?.coverImage?.extraLarge || al?.coverImage?.large
    || jk?.images?.jpg?.large_image_url || jk?.images?.jpg?.image_url || '';

  const synopsisEn = al?.description
    ? al.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim()
    : jk?.synopsis
    ? jk.synopsis.replace(/\[Written by MAL Rewrite\]/g, '').trim()
    : '';

  const genreSet = new Set<string>();
  if (al?.genres) al.genres.forEach((g: string) => genreSet.add(g));
  if (jk?.genres) jk.genres.forEach((g: any) => genreSet.add(g.name));

  const studio = al?.studios?.nodes?.map((s: any) => s.name).join(', ')
    || jk?.studios?.map((s: any) => s.name).join(', ') || '';

  const year = al?.startDate?.year || jk?.year || jk?.aired?.prop?.from?.year || null;
  const episodes = al?.episodes || jk?.episodes || 0;
  const malId = jk?.mal_id || null;
  const anilistId = al?.id || null;
  const isMovie = al?.format === 'MOVIE' || jk?.type === 'Movie';

  let dur: number | null = null;
  if (al?.duration) dur = al.duration;
  else if (jk?.duration) { const m = jk.duration.match(/(\d+)\s*min/); if (m) dur = +m[1]; }

  const apiStatus = mapStatus(al?.status || jk?.status);

  let season = original.season >= 1 ? original.season : 1;
  let cour = original.cour || '';
  let parentTitle = original.parent_title || '';

  if (!isMovie) {
    if (!cour) {
      const detectedCour = extractCourFromTitle(original.title);
      if (detectedCour) cour = detectedCour;
    }
    if (original.season < 1) {
      const detectedSeasonFromOriginal = extractSeasonFromTitle(original.title);
      if (detectedSeasonFromOriginal && detectedSeasonFromOriginal >= 1) {
        season = detectedSeasonFromOriginal;
      }
    }
    if (season > 1 && !parentTitle) {
      parentTitle = getParentTitle(original.title, season);
    }
  }

  let rating = original.rating || 0;
  const apiScore = al?.averageScore ? al.averageScore / 10 : jk?.score || 0;
  if (apiScore > 0 && rating === 0) {
    rating = Math.min(10, Math.round(apiScore * 10) / 10);
  }

  return {
    title: bestTitle,
    cover_url: cover,
    synopsis: synopsisEn,
    genre: [...genreSet].slice(0, 8).join(', '),
    studio,
    release_year: year,
    episodes,
    rating,
    mal_id: malId,
    anilist_id: anilistId,
    is_movie: isMovie,
    duration_minutes: dur,
    status: apiStatus || original.status,
    season,
    cour,
    parent_title: parentTitle,
    enriched: true,
    enrichSource: [al ? 'AniList' : '', jk ? 'MAL' : ''].filter(Boolean).join('+') || c.source,
    matchConfidence: scoreToConfidence(c.similarity),
    matchScore: c.similarity,
  };
}

function ConfidenceBadge({ confidence, score }: {
  confidence?: BulkItem['matchConfidence']; score?: number;
}) {
  if (!confidence || confidence === 'none') return null;
  const cfg = {
    high:   { Icon: CheckCircle2, label: 'Akurat',      cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' },
    medium: { Icon: AlertTriangle, label: 'Perlu Cek',  cls: 'bg-amber-500/10  text-amber-500  border-amber-500/25' },
    low:    { Icon: HelpCircle,    label: 'Tidak Yakin', cls: 'bg-red-500/10    text-red-500    border-red-500/25' },
  }[confidence];
  const { Icon, label, cls } = cfg;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls}`}>
            <Icon className="w-3 h-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] font-mono">
          Match Score: {(score || 0).toFixed(4)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
