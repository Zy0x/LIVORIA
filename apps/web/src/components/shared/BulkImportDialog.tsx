import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  getCurrentImportUserId,
  insertMediaImportRow,
  parseMediaImportChunkWithAi,
  type MediaImportTable,
} from '@/features/media/services/bulk-import.repository';
import { readBulkImportFile } from '@/features/media/services/bulk-import-file';
import {
  Upload, Sparkles, Loader2, Edit2, Trash2, Check, X,
  ChevronDown, ChevronUp, FileSpreadsheet, ClipboardPaste,
  Search, RefreshCw, Download, Square, RotateCcw, Image,
  Globe, BookOpen, Building2, CalendarClock, Film, Link2,
  AlertTriangle, CheckCircle2, HelpCircle, ChevronRight,
  Star, Bookmark, Clapperboard, Zap, Languages, Filter,
  Eye, EyeOff, ArrowRight,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  fetchAlternativeTitles,
  serializeAlternativeTitles,
  deserializeAlternativeTitles,
  buildTitleDisplayList,
} from '@/hooks/useAlternativeTitles';
import { translateToIndonesian } from '@/hooks/useAnimeSearch';
import { sanitizeImportRow } from '@/lib/import-export-normalization';
import type { BulkItem, SearchCandidate } from '@/features/media/services/bulk-import.types';
import {
  buildBulkItemFromRaw,
  getParentTitle,
  interpretNote,
  scoreToConfidence,
} from '@/features/media/services/bulk-import-normalization';
import {
  ANILIST_GQL,
  candidateToEnrichment,
  fetchWithRetry,
  searchWithAccuracy,
} from '@/features/media/services/bulk-import-enrichment';
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: 'anime' | 'donghua';
  onImportComplete?: () => void;
}
import {
  AltTitlesInline,
  ConfidenceBadge,
  InlineTitleEditor,
  ParentTitleField,
} from './BulkImportDialogPrimitives';
import { nowTime, sleep, type LogEntry, type Step } from './bulk-import-dialog-helpers';
import { BulkImportInputStep } from './BulkImportInputStep';
import { BulkImportProcessingStep } from './BulkImportProcessingStep';
import { BulkImportPreviewStep } from './BulkImportPreviewStep';
import { BulkImportProgressStep } from './BulkImportProgressStep';
const BulkImportDialog = ({ open, onOpenChange, mediaType, onImportComplete }: Props) => {
  const [step, setStep] = useState<Step>('input');
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<BulkItem[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<'completed'|'planned'|'on-going'>('completed');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState({ current:0, total:0, ok:0, skip:0, err:0 });
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [useAI, setUseAI] = useState(true);
  const [enrichDelay, setEnrichDelay] = useState(3000);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [filterNeedVerify, setFilterNeedVerify] = useState(false);
  const runningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const [editingTitleIdx, setEditingTitleIdx] = useState<number | null>(null);
  const [pickerLoading, setPickerLoading] = useState<number | null>(null);
  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { time: nowTime(), msg, type }]);
    setTimeout(() => logBoxRef.current?.scrollTo(0, logBoxRef.current.scrollHeight), 50);
  }, []);
  const resetAll = useCallback(() => {
    setStep('input'); setRawText(''); setParsedItems([]); setEditingTitleIdx(null);
    setAiProcessing(false); setImportProgress({current:0,total:0,ok:0,skip:0,err:0});
    setExpandedItems(new Set()); setLogs([]); setRunning(false); runningRef.current = false;
    setFilterNeedVerify(false);
  }, []);
  /**
   * Parse array of raw objects menjadi BulkItem[].
   * Digunakan oleh:
   * - parseHtmlStyleJSON (dari AI)
   * - parseLocally (dari JSON/NDJSON/CSV lokal)
   * Keduanya kini menggunakan buildBulkItemFromRaw sebagai sumber kebenaran.
   */
  function parseRawArray(arr: any[]): BulkItem[] {
    return arr
      .map(obj => buildBulkItemFromRaw(obj, defaultStatus))
      .filter((item): item is BulkItem => item !== null);
  }
  function parseHtmlStyleJSON(arr: any[]): BulkItem[] {
    return parseRawArray(arr);
  }
  function parseLocally(text: string): BulkItem[] {
    const trimmed = text.replace(/^\uFEFF/, '').trim();
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : parsed?.items;
      if (Array.isArray(arr) && arr.length > 0) {
        return parseRawArray(arr);
      }
    } catch {}
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const ndItems: BulkItem[] = [];
    let allJson = true;
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.title || obj.Title || obj.judul) {
          const item = buildBulkItemFromRaw(obj, defaultStatus);
          if (item) ndItems.push(item);
        } else {
          allJson = false;
        }
      } catch {
        allJson = false;
        break;
      }
    }
    if (allJson && ndItems.length > 0) return ndItems;
    const csvItems: BulkItem[] = [];
    for (const line of lines) {
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.split(',').map(s => s.trim());
      const title = parts[0]?.trim() || '';
      if (!title || /^\d+$/.test(title)) continue;
      const season  = parseInt(parts[1]) || 1;
      const rating  = parseFloat(parts[2]) || 0;
      const noteRaw = (parts[3]?.trim() || '');
      const rawObj = {
        title,
        season,
        rating,
        note: noteRaw,
        status: defaultStatus,
        cour: parts[4]?.trim() || '',
        parent_title: season > 1 ? title.replace(/\s*(season|s)\s*\d+/gi, '').trim() : '',
      };
      const item = buildBulkItemFromRaw(rawObj, defaultStatus);
      if (item) csvItems.push(item);
    }
    return csvItems;
  }
  const [aiProgress, setAiProgress] = useState<{
    current: number;
    total: number;
    provider: string;
    model: string;
    itemsSoFar: number;
    status?: 'processing' | 'rotating' | 'error' | 'success';
    lastError?: string;
  }>({ current: 0, total: 0, provider: '', model: '', itemsSoFar: 0, status: 'processing' });
  const [preferredAi, setPreferredAi] = useState<{ provider: string; model: string } | null>(null);
  /** Split text into chunks of ~20 lines for rate-limit safety */
  const splitIntoChunks = (text: string, maxLines = 20): string[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length <= maxLines) return [text];
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += maxLines) {
      chunks.push(lines.slice(i, i + maxLines).join('\n'));
    }
    return chunks;
  };
  const processWithAI = async () => {
    if (!rawText.trim()) {
      toast({ title: 'Teks kosong', description: 'Masukkan daftar terlebih dahulu.', variant: 'destructive' });
      return;
    }
    setStep('processing'); setAiProcessing(true);
    setAiProgress({ current: 0, total: 0, provider: '', model: '', itemsSoFar: 0 });
    try {
      if (useAI) {
        const chunks = splitIntoChunks(rawText.trim(), 60);
        const allItems: any[] = [];
        setAiProgress({ current: 0, total: chunks.length, provider: 'Memulai Racing...', model: 'Semua Model', itemsSoFar: 0, status: 'processing' });
        const processChunk = async (chunkText: string, preferred?: { provider: string; model: string }) => {
          return parseMediaImportChunkWithAi({
            text: chunkText,
            mediaType,
            defaultStatus,
            preferredProvider: preferred?.provider,
            preferredModel: preferred?.model,
          });
        };
        const chunkResults: { index: number; items: any[]; provider: string; model: string }[] = [];
        const maxChunkRetries = 1;
        let lastWorkingAi: { provider: string; model: string } | null = preferredAi;
        const chunkPromises = chunks.map(async (chunk, index) => {
          for (let attempt = 0; attempt <= maxChunkRetries; attempt++) {
            try {
              if (attempt > 0) {
                setAiProgress(p => ({
                  ...p,
                  status: 'rotating',
                  provider: lastWorkingAi?.provider || 'Rotasi Provider...',
                  model: lastWorkingAi?.model || p.model,
                }));
                await new Promise(r => setTimeout(r, 1000));
              }
              const result = await processChunk(chunk, lastWorkingAi || undefined);
              const workingAi = { provider: result.provider, model: result.model };
              chunkResults.push({ index, items: result.items || [], provider: result.provider, model: result.model });
              lastWorkingAi = workingAi;
              setPreferredAi(workingAi);
              setAiProgress(p => ({
                ...p,
                current: p.current + 1,
                provider: result.provider,
                model: result.model,
                itemsSoFar: chunkResults.reduce((acc, curr) => acc + curr.items.length, 0),
                status: 'processing'
              }));
              return;
            } catch (err: any) {
              console.error(`Chunk ${index + 1} failed on attempt ${attempt + 1}:`, err);
              if (attempt === maxChunkRetries) {
                throw new Error(`Chunk ${index + 1} gagal setelah ${attempt + 1} percobaan: ${err?.message || 'Unknown error'}`);
              }
            }
          }
        });
        await Promise.all(chunkPromises);
        chunkResults.sort((a, b) => a.index - b.index);
        chunkResults.forEach(res => allItems.push(...res.items));
        if (chunkResults.some(res => res.items.length === 0)) {
          throw new Error('Beberapa chunk gagal diproses. Coba lagi nanti atau gunakan teks yang lebih pendek.');
        }
        setParsedItems(parseHtmlStyleJSON(allItems));
      } else {
        const items = parseLocally(rawText);
        if (!items.length) throw new Error('Tidak ada data valid');
        setParsedItems(items);
      }
      setAiProgress(p => ({ ...p, status: 'success' }));
      setStep('preview');
    } catch (err: any) {
      console.error('AI processing error:', err);
      setAiProgress(p => ({ ...p, status: 'error', lastError: err.message }));
      toast({ title: 'Gagal memproses AI', description: `${err.message}`, variant: 'destructive' });
      setStep('input');
    } finally { setAiProcessing(false); }
  };
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await readBulkImportFile(file);
      setRawText(result.text);
      if (result.title) {
        toast({ title: result.title, description: result.description });
      }
    } catch (err: any) {
      toast({
        title: 'Gagal membaca file',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      e.target.value = '';
    }
  };
  const applyCandidate = useCallback(async (idx: number, candidate: SearchCandidate) => {
    setEditingTitleIdx(null);
    setPickerLoading(idx);
    try {
      const item = parsedItems[idx];
      let finalCandidate = { ...candidate };
      if (candidate.source === 'anilist' && !candidate._jk) {
        try {
          const jTitle = candidate.title_english || candidate.title;
          const jRes = await fetchWithRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(jTitle)}&limit=3`);
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
      const updated = [...parsedItems];
      let finalConfidence = enriched.matchConfidence || 'none';
      if (!item.reviewed && (item.matchConfidence === 'medium' || item.matchConfidence === 'low')) {
        if (finalConfidence === 'high') finalConfidence = 'medium';
      }
      updated[idx] = {
        ...item,
        ...enriched,
        matchConfidence: finalConfidence,
        candidates: item.candidates,
        originalTitle: item.originalTitle || item.title,
        watch_status: item.watch_status || 'none',
        watched_at:   item.watched_at || null,
      };
      setParsedItems(updated);
      toast({ title: '✓ Auto-fill selesai', description: enriched.title || item.title });
    } finally { setPickerLoading(null); }
  }, [parsedItems, mediaType]);
  const reEnrichItem = async (idx: number) => {
    setPickerLoading(idx);
    try {
      const item = parsedItems[idx];
      const candidates = await searchWithAccuracy(item.title, item.season);
      const updated = [...parsedItems];
      updated[idx] = { ...item, candidates };
      if (candidates[0]) {
        await applyCandidate(idx, candidates[0]);
      } else {
        updated[idx] = { ...updated[idx], matchConfidence: 'none', matchScore: 0 };
        setParsedItems(updated);
        toast({ title: 'Tidak ditemukan', description: item.title, variant: 'destructive' });
      }
    } finally { setPickerLoading(null); }
  };
  const enrichAllItems = async () => {
    setStep('enriching'); setRunning(true); runningRef.current = true; setLogs([]);
    const total = parsedItems.length;
    setImportProgress({ current:0, total, ok:0, skip:0, err:0 });
    addLog(`🚀 Auto-fill ${total} ${mediaType} — parallel batching (size 3) + deep matching`, 'info');
    const updatedItems = [...parsedItems];
    let ok=0, skip=0, err=0;
    const BATCH_SIZE = 3;
    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (!runningRef.current) { addLog('⏹ Dihentikan manual', 'skip'); break; }
      const batchIndices = Array.from({ length: Math.min(BATCH_SIZE, total - i) }, (_, k) => i + k);
      await Promise.all(batchIndices.map(async (idx) => {
        if (!runningRef.current) return;
        const item = updatedItems[idx];
        if (item.enriched && item.enrichSource === 'Import') {
          addLog(`[${idx+1}/${total}] ⏭ Skip (dari export Livoria): "${item.title}"`, 'ok');
          ok++;
          return;
        }
        addLog(`[${idx+1}/${total}] Mencari "${item.originalTitle || item.title}" S${item.season}…`, 'info');
        try {
          const candidates = await searchWithAccuracy(item.title, item.season);
          const best = candidates[0];
          const bestScore = best?.similarity || 0;
          const confidence = scoreToConfidence(bestScore);
          updatedItems[idx] = { ...item, candidates };
          if (!best || bestScore < 0.15) {
            addLog(`[${idx+1}] ⚠ Tidak cocok: "${item.originalTitle || item.title}"`, 'skip');
            updatedItems[idx] = { ...updatedItems[idx], matchConfidence: 'none', matchScore: 0 };
            skip++;
          } else {
            let finalC = { ...best };
            const crossRefPromises = [];
            if (best.source === 'anilist' && !best._jk) {
              crossRefPromises.push((async () => {
                try {
                  const jk = await fetchWithRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(best.title)}&limit=3`);
                  if (jk?.data?.[0]) finalC._jk = jk.data[0];
                } catch {}
              })());
            } else if (best.source === 'jikan' && !best._al) {
              crossRefPromises.push((async () => {
                try {
                  const r = await fetch('https://graphql.anilist.co', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: ANILIST_GQL, variables: { s: best.title } }),
                  });
                  const d = await r.json();
                  if (d.data?.Page?.media?.[0]) finalC._al = d.data.Page.media[0];
                } catch {}
              })());
            }
            if (crossRefPromises.length > 0) await Promise.all(crossRefPromises);
            addLog(`[${idx+1}] Mengisi data dari MAL/AniList…`, 'info');
            const enriched = await candidateToEnrichment(finalC, item, mediaType, addLog);
            enriched.matchConfidence = confidence;
            enriched.matchScore = bestScore;
            try {
              const alt = await fetchAlternativeTitles({
                malId: enriched.mal_id, anilistId: enriched.anilist_id,
                storedTitle: enriched.title || item.title, mediaType,
              });
              if (alt) enriched.alternative_titles = serializeAlternativeTitles(alt);
            } catch {}
            updatedItems[idx] = {
              ...item,
              ...enriched,
              candidates,
              originalTitle: item.originalTitle || item.title,
              watch_status: item.watch_status || 'none',
              watched_at:   item.watched_at || null,
            };
            const cLabel = confidence === 'high' ? '✓ Akurat' : confidence === 'medium' ? '⚠ Perlu Cek' : '✗ Tidak Yakin';
            const groupInfo = enriched.season && enriched.season > 1
              ? ` | S${enriched.season}${enriched.cour ? ' '+enriched.cour : ''}${enriched.parent_title ? ' → '+enriched.parent_title : ''}`
              : '';
            addLog(`[${idx+1}] ${cLabel} (${Math.round(bestScore*100)}%) "${enriched.title}"${groupInfo} via ${enriched.enrichSource}`,
              confidence === 'high' ? 'ok' : confidence === 'medium' ? 'skip' : 'err');
            ok++;
          }
        } catch(e: any) {
          addLog(`[${idx+1}] ✗ Error [${item.originalTitle || item.title}]: ${e.message}`, 'err');
          err++;
        }
      }));
      setImportProgress({ current: Math.min(i + BATCH_SIZE, total), total, ok, skip, err });
      setParsedItems([...updatedItems]);
      if (i + BATCH_SIZE < total && runningRef.current) await sleep(enrichDelay);
    }
    setRunning(false); runningRef.current = false;
    const needCheck = updatedItems.filter(i => i.matchConfidence === 'medium' || i.matchConfidence === 'low').length;
    addLog(`✅ Selesai — OK:${ok} Skip:${skip} Err:${err}${needCheck > 0 ? ` · ${needCheck} perlu verifikasi` : ''}`, 'ok');
    if (needCheck > 0) {
      toast({ title: `${needCheck} item perlu verifikasi`, description: 'Gunakan tombol filter untuk melihat semua.' });
    }
  };
  const startImport = async () => {
    if (!parsedItems.length) return;
    setStep('importing'); setRunning(true); runningRef.current = true;
    const total = parsedItems.length;
    setImportProgress({current:0,total,ok:0,skip:0,err:0}); setLogs([]);
    const userId = await getCurrentImportUserId();
    if (!userId) { toast({ title: 'Login diperlukan', variant: 'destructive' }); setStep('preview'); return; }
    addLog(`🚀 Import ${total} ${mediaType}`, 'info');
    const table: MediaImportTable = mediaType === 'anime' ? 'anime' : 'donghua';
    let ok=0, skip=0, err=0;
    for (let i = 0; i < parsedItems.length; i++) {
      if (!runningRef.current) { addLog('⏹ Import dihentikan', 'skip'); break; }
      const item = parsedItems[i];
      const resolvedParentTitle = item.parent_title
        || (item.season > 1 ? getParentTitle(item.title, item.season) : '');
      const sanitized = sanitizeImportRow({
        ...item,
        parent_title:  resolvedParentTitle,
        notes:         item.note || '',
        watch_status:  item.watch_status || 'none',
        watched_at:    item.watched_at || null,
      });
      const row: Record<string, unknown> = {
        user_id: userId,
        title:              sanitized.title,
        status:             sanitized.status,
        genre:              sanitized.genre,
        rating:             sanitized.rating,
        episodes:           sanitized.episodes,
        episodes_watched:   sanitized.episodes_watched,
        cover_url:          sanitized.cover_url,
        synopsis:           sanitized.synopsis,
        notes:              sanitized.notes,
        season:             sanitized.season,
        cour:               sanitized.cour,
        streaming_url:      sanitized.streaming_url,
        schedule:           sanitized.schedule,
        parent_title:       sanitized.parent_title,
        is_favorite:        sanitized.is_favorite,
        is_bookmarked:      sanitized.is_bookmarked,
        is_movie:           sanitized.is_movie,
        is_hentai:          item.is_hentai ?? false,
        duration_minutes:   sanitized.duration_minutes,
        release_year:       sanitized.release_year,
        studio:             sanitized.studio,
        mal_url:            sanitized.mal_url,
        anilist_url:        sanitized.anilist_url,
        mal_id:             sanitized.mal_id,
        anilist_id:         sanitized.anilist_id,
        alternative_titles: sanitized.alternative_titles,
        watch_status:       sanitized.watch_status,
        watched_at:         sanitized.watched_at,
      };
      try {
        await insertMediaImportRow(table, row);
        addLog(`[${i + 1}] OK: ${item.title} (S${item.season}${item.cour ? '/' + item.cour : ''})`, 'ok');
        ok++;
      } catch (error: any) {
        if (error?.code === '23505') {
          addLog(`[${i + 1}] Duplikat: ${item.title}`, 'skip');
          skip++;
        } else {
          addLog(`[${i + 1}] Error [${item.title}]: ${error?.message || 'Import gagal'}`, 'err');
          err++;
        }
      }
      setImportProgress({current:i+1,total,ok,skip,err});
    }
    setRunning(false); runningRef.current = false;
    addLog(`✅ Import selesai — OK:${ok} Skip:${skip} Err:${err}`, 'ok');
    toast({ title: 'Import selesai!', description: `${ok} berhasil, ${skip} dilewati, ${err} gagal.` });
    onImportComplete?.();
  };
  const updateItem = (idx: number, u: Partial<BulkItem>) =>
    setParsedItems(prev => prev.map((it, i) => i === idx ? { ...it, ...u } : it));
  const removeItem = (idx: number) => {
    if (editingTitleIdx === idx) setEditingTitleIdx(null);
    setParsedItems(prev => prev.filter((_,i) => i !== idx));
  };
  const toggleExpand = (idx: number) =>
    setExpandedItems(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  const stopProcess = () => { runningRef.current = false; setRunning(false); };
  const downloadLog = () => {
    const txt = logs.map(e => `[${e.time}] ${e.msg}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
    a.download = `livoria-bulk-log-${Date.now()}.txt`;
    a.click();
  };
  const enrichedCount   = parsedItems.filter(i => i.enriched).length;
  const uncertainCount  = parsedItems.filter(i => i.matchConfidence === 'medium' || i.matchConfidence === 'low').length;
  const noMatchCount    = parsedItems.filter(i => i.enriched && i.matchConfidence === 'none').length;
  const watchingCount   = parsedItems.filter(i => i.watch_status && i.watch_status !== 'none').length;
  const needsTranslation = parsedItems.filter(i => i.enriched && i.synopsis && !i._synopsisTranslated).length;
  const translateAllSynopses = async () => {
    setStep('translating'); setRunning(true); runningRef.current = true; setLogs([]);
    const total = parsedItems.length;
    setImportProgress({ current: 0, total, ok: 0, skip: 0, err: 0 });
    addLog(`🌐 Menerjemahkan sinopsis ${total} item ke Bahasa Indonesia (paralel batching)…`, 'info');
    const updatedItems = [...parsedItems];
    let ok = 0, skip = 0, err = 0;
    const BATCH_SIZE = 3;
    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (!runningRef.current) { addLog('⏹ Dihentikan', 'skip'); break; }
      const batchIndices = Array.from({ length: Math.min(BATCH_SIZE, total - i) }, (_, k) => i + k);
      await Promise.all(batchIndices.map(async (idx) => {
        if (!runningRef.current) return;
        const item = updatedItems[idx];
        if (!item.synopsis || item._synopsisTranslated) {
          skip++;
          return;
        }
        addLog(`[${idx + 1}/${total}] Menerjemahkan "${item.title}"…`, 'info');
        try {
          const translated = await translateToIndonesian(item.synopsis);
          updatedItems[idx] = { ...item, synopsis: translated, _synopsisTranslated: true };
          addLog(`[${idx + 1}] ✓ Terjemahan selesai`, 'ok');
          ok++;
        } catch (e: any) {
          addLog(`[${idx + 1}] ✗ Gagal: ${e.message}`, 'err');
          err++;
        }
      }));
      setImportProgress({ current: Math.min(i + BATCH_SIZE, total), total, ok, skip, err });
      setParsedItems([...updatedItems]);
      if (i + BATCH_SIZE < total && runningRef.current) await sleep(1000);
    }
    setRunning(false); runningRef.current = false;
    addLog(`✅ Terjemahan selesai — OK:${ok} Skip:${skip} Err:${err}`, 'ok');
    setParsedItems([...updatedItems]);
    setStep('preview');
  };
  const toggleReviewed = (idx: number) => {
    const updated = [...parsedItems];
    const item = updated[idx];
    const newReviewed = !item.reviewed;
    updated[idx] = { 
      ...item, 
      reviewed: newReviewed,
      matchConfidence: newReviewed ? 'high' : (item.matchScore && item.matchScore < 0.75 ? 'medium' : 'high')
    };
    setParsedItems(updated);
  };
  const displayedItems = filterNeedVerify
    ? parsedItems
        .map((item, originalIdx) => ({ item, originalIdx }))
        .filter(({ item }) => item.matchConfidence === 'medium' || item.matchConfidence === 'low' || !item.enriched || item.reviewed)
    : parsedItems.map((item, originalIdx) => ({ item, originalIdx }));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetAll(); onOpenChange(v); }}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-3 sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Upload className="w-5 h-5 text-primary" />
            Impor {mediaType === 'anime' ? 'Anime' : 'Donghua'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Paste data, upload file (JSON/CSV/Excel), atau tulis prompt {'->'} Parse {'->'} Edit & Auto-Fill dari MAL/AniList {'->'} Import ke database
          </DialogDescription>
        </DialogHeader>
        <BulkImportInputStep
          step={step}
          mediaType={mediaType}
          defaultStatus={defaultStatus}
          setDefaultStatus={setDefaultStatus}
          enrichDelay={enrichDelay}
          setEnrichDelay={setEnrichDelay}
          rawText={rawText}
          setRawText={setRawText}
          fileInputRef={fileInputRef}
          handleFileImport={handleFileImport}
          processWithAI={processWithAI}
        />
        <BulkImportProcessingStep step={step} aiProgress={aiProgress} useAI={useAI} />
        <BulkImportPreviewStep
          step={step}
          parsedItems={parsedItems}
          enrichedCount={enrichedCount}
          uncertainCount={uncertainCount}
          noMatchCount={noMatchCount}
          watchingCount={watchingCount}
          needsTranslation={needsTranslation}
          aiProcessing={aiProcessing}
          running={running}
          filterNeedVerify={filterNeedVerify}
          setFilterNeedVerify={setFilterNeedVerify}
          displayedItems={displayedItems}
          mediaType={mediaType}
          expandedItems={expandedItems}
          editingTitleIdx={editingTitleIdx}
          setEditingTitleIdx={setEditingTitleIdx}
          updateItem={updateItem}
          reEnrichItem={reEnrichItem}
          pickerLoading={pickerLoading}
          translateAllSynopses={translateAllSynopses}
          startImport={startImport}
          setStep={setStep}
          setParsedItems={setParsedItems}
          enrichAllItems={enrichAllItems}
          applyCandidate={applyCandidate}
          toggleExpand={toggleExpand}
          toggleReviewed={toggleReviewed}
          removeItem={removeItem}
        />
        <BulkImportProgressStep
          step={step}
          importProgress={importProgress}
          running={running}
          stopProcess={stopProcess}
          setStep={setStep}
          resetAll={resetAll}
          onOpenChange={onOpenChange}
          logs={logs}
          logBoxRef={logBoxRef}
          downloadLog={downloadLog}
        />
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
