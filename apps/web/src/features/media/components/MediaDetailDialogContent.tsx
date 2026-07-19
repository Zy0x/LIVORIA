import { Suspense, type ComponentType, type ReactNode } from 'react';
import {
  Bookmark,
  Building2,
  CalendarClock,
  CheckCircle,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  Film,
  Heart,
  Layers,
  Minus,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingState from '@/shared/components/LoadingState';
import SmartStreamButton from '@/components/shared/SmartStreamButton';
import { toast } from '@/hooks/use-toast';

type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';

interface MediaDetailDialogContentProps {
  item: any | null;
  items: any[];
  mediaType: 'anime' | 'donghua';
  tableName: 'anime' | 'donghua';
  queryKey: readonly unknown[];
  queryClient: { invalidateQueries: (args: { queryKey: readonly unknown[] }) => void };
  statusConfig: Record<string, any>;
  watchStatusConfig: Record<string, any>;
  genrePalette: Record<string, string>;
  dayLabels: Record<string, string>;
  getWatchStatus: (item: any) => WatchStatus;
  extractExtra: (item: any) => any;
  extractAltTitles: (item: any) => any;
  formatDurationLong: (minutes: number) => string;
  WatchStatusButton: ComponentType<{ item: any; onUpdate: (item: any, status: WatchStatus) => void }>;
  WatchedCountdown: ComponentType<{ watchedAt: string }>;
  EpisodeInlineEditor: ComponentType<{ watched: number; total: number; onSave: (watched: number, total: number) => void }>;
  AlternativeTitlesPanel: ComponentType<any>;
  onClose: () => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onCoverClick: (url: string, title: string) => void;
  onUpdateWatchStatus: (item: any, status: WatchStatus) => void;
  onUpdateEpisode: (item: any, watched: number, total?: number) => void;
}

export function MediaDetailDialogContent({
  item,
  items,
  mediaType,
  tableName,
  queryKey,
  queryClient,
  statusConfig,
  watchStatusConfig,
  genrePalette,
  dayLabels,
  getWatchStatus,
  extractExtra,
  extractAltTitles,
  formatDurationLong,
  WatchStatusButton,
  WatchedCountdown,
  EpisodeInlineEditor,
  AlternativeTitlesPanel,
  onClose,
  onEdit,
  onDelete,
  onCoverClick,
  onUpdateWatchStatus,
  onUpdateEpisode,
}: MediaDetailDialogContentProps) {
  if (!item) return null;

  const freshItem = items.find(a => a.id === item.id) || item;
  const cfg = statusConfig[freshItem.status] || statusConfig.planned;
  const extra = extractExtra(freshItem);
  const genres = freshItem.genre ? freshItem.genre.split(',').map((g: string) => g.trim()).filter(Boolean) : [];
  const schedules = freshItem.schedule ? freshItem.schedule.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const watched = freshItem.episodes_watched || 0;
  const hasKnownEps = freshItem.episodes > 0;
  const progress = hasKnownEps ? Math.min(100, (watched / freshItem.episodes) * 100) : 0;
  const watchStatus = getWatchStatus(freshItem);
  const watchStatusMeta = watchStatusConfig[watchStatus];
  const WatchStatusIcon = watchStatusMeta.icon;

  const copyLink = () => {
    if (!freshItem.streaming_url) return;
    navigator.clipboard.writeText(freshItem.streaming_url);
    toast({ title: 'Link disalin!' });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-lg leading-tight flex items-center gap-2 flex-wrap">
          {freshItem.title}
          {freshItem.is_movie && <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20"><Film className="w-2.5 h-2.5" />{mediaType === 'anime' ? 'MOVIE' : 'FILM'}</Badge>}
          {freshItem.is_favorite && <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-300/50"><Heart className="w-2.5 h-2.5 fill-amber-500" />Favorit</Badge>}
          {freshItem.is_bookmarked && <Badge className="bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-300/50"><Bookmark className="w-2.5 h-2.5 fill-sky-500" />Bookmark</Badge>}
        </DialogTitle>
        <DialogDescription className="text-xs">
          {cfg.label}
          {freshItem.is_movie ? ' · Movie' : (freshItem.season > 0 ? ` · Season ${freshItem.season}` : '')}
          {freshItem.cour ? ` · ${freshItem.cour}` : ''}
          {freshItem.parent_title ? ` · ${freshItem.parent_title}` : ''}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 mt-2">
        {freshItem.cover_url && (
          <div className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-border cursor-pointer hover:opacity-90 transition-opacity" onClick={() => onCoverClick(freshItem.cover_url, freshItem.title)}>
            <img src={freshItem.cover_url} alt={freshItem.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="rounded-xl border border-border p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Tonton Saya</p>
          <div className="flex items-center gap-2 flex-wrap">
            <WatchStatusButton item={freshItem} onUpdate={onUpdateWatchStatus} />
            {watchStatus === 'watched' && freshItem.watched_at && <WatchedCountdown watchedAt={freshItem.watched_at} />}
          </div>
        </div>

        {!freshItem.is_movie && (
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Update Progress Episode</p>
            <div className="flex items-center gap-2">
              <button disabled={watched <= 0} onClick={() => onUpdateEpisode(freshItem, Math.max(0, watched - 1))} className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted hover:bg-accent disabled:opacity-30 transition-colors"><Minus className="w-4 h-4 text-muted-foreground" /></button>
              <div className="flex-1 flex justify-center"><EpisodeInlineEditor watched={watched} total={freshItem.episodes || 0} onSave={(w, t) => onUpdateEpisode(freshItem, w, t)} /></div>
              <button disabled={freshItem.episodes > 0 && watched >= freshItem.episodes} onClick={() => onUpdateEpisode(freshItem, watched + 1)} className="flex items-center justify-center gap-1 px-3 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors text-xs font-bold"><Plus className="w-3.5 h-3.5" />Ep</button>
            </div>
            {hasKnownEps && <ProgressBar watched={watched} total={freshItem.episodes} progress={progress} />}
          </div>
        )}

        <div className="rounded-xl border border-border p-3 space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Informasi</p>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg border p-2.5 text-center ${cfg.bg}`}><span className={`w-2 h-2 rounded-full mx-auto block mb-1 ${cfg.dot} ${freshItem.status === 'on-going' ? 'animate-pulse' : ''}`} /><p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p><p className="text-[9px] text-muted-foreground mt-0.5">Status Rilis</p></div>
            {freshItem.rating > 0 ? <Metric icon={<Star className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto mb-1" />} value={`${freshItem.rating}/10`} label="Rating" /> : freshItem.is_movie && freshItem.duration_minutes ? <Metric icon={<Clock className="w-4 h-4 text-violet-500 mx-auto mb-1" />} value={formatDurationLong(freshItem.duration_minutes)} label="Durasi" valueClassName="text-xs text-violet-600 dark:text-violet-400" /> : !freshItem.is_movie ? <Metric icon={<Eye className="w-4 h-4 text-muted-foreground mx-auto mb-1" />} value={hasKnownEps ? `${watched}/${freshItem.episodes}` : watched > 0 ? `${watched} ep` : '-'} label="Episode" /> : null}
            <Metric icon={<WatchStatusIcon className={`w-4 h-4 mx-auto mb-1 ${watchStatusMeta.color}`} />} value={watchStatusMeta.label} label="Status Tonton" valueClassName={`text-xs ${watchStatusMeta.color}`} />
            {freshItem.season > 0 && !freshItem.is_movie && <Metric icon={<Layers className="w-4 h-4 text-muted-foreground mx-auto mb-1" />} value={`S${freshItem.season}${freshItem.cour ? ` · ${freshItem.cour}` : ''}`} label="Season" />}
          </div>
          {(extra.studio || extra.release_year) && <div className="flex items-center gap-4 flex-wrap">{extra.studio && <SmallInfo icon={<Building2 className="w-3 h-3 text-muted-foreground shrink-0" />} text={extra.studio} />}{extra.release_year && <SmallInfo icon={<CalendarClock className="w-3 h-3 text-muted-foreground shrink-0" />} text={extra.release_year} />}</div>}
        </div>

        {genres.length > 0 && <div className="rounded-xl border border-border p-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p><div className="flex flex-wrap gap-1.5">{genres.map((g: string) => <span key={g} className="text-[10px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: (genrePalette[g] || '#64748b') + '22', color: genrePalette[g] || 'hsl(var(--muted-foreground))' }}>{g}</span>)}</div></div>}
        {schedules.length > 0 && freshItem.status === 'on-going' && <div className="rounded-xl border border-border p-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jadwal Tayang</p><div className="flex flex-wrap gap-1.5">{schedules.map((d: string) => <span key={d} className="px-2.5 py-1 rounded-lg bg-info/10 text-info text-[10px] font-semibold border border-info/20">{dayLabels[d] || d}</span>)}</div></div>}
        {(extra.mal_url || extra.anilist_url || freshItem.streaming_url) && <LinksBlock extra={extra} item={freshItem} onCopy={copyLink} />}
        {freshItem.synopsis && <TextBlock title="Sinopsis" text={freshItem.synopsis} />}
        {freshItem.notes && <TextBlock title="Catatan Pribadi" text={freshItem.notes} />}

        <Suspense fallback={<LoadingState label="Memuat judul alternatif..." />}>
          <AlternativeTitlesPanel storedTitle={freshItem.title} altTitles={extractAltTitles(freshItem)} malId={extractExtra(freshItem).mal_id} anilistId={extractExtra(freshItem).anilist_id} mediaType={mediaType} itemId={freshItem.id} tableName={tableName} onFetched={() => queryClient.invalidateQueries({ queryKey })} />
        </Suspense>

        <div className="flex gap-2 pt-2 border-t border-border">
          <button onClick={() => { onClose(); setTimeout(() => onEdit(freshItem), 200); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]"><Edit2 className="w-4 h-4" />Edit</button>
          <button onClick={() => { onClose(); setTimeout(() => onDelete(freshItem), 200); }} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20 min-h-[44px]"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </>
  );
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${className}`}>{children}</span>;
}

function Metric({ icon, value, label, valueClassName = 'text-sm' }: { icon: ReactNode; value: string | number; label: string; valueClassName?: string }) {
  return <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">{icon}<p className={`font-bold ${valueClassName}`}>{value}</p><p className="text-[9px] text-muted-foreground">{label}</p></div>;
}

function SmallInfo({ icon, text }: { icon: ReactNode; text: string | number }) {
  return <div className="flex items-center gap-1.5">{icon}<span className="text-xs text-foreground font-medium">{text}</span></div>;
}

function ProgressBar({ watched, total, progress }: { watched: number; total: number; progress: number }) {
  return <div className="mt-2"><div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1"><span>{watched} / {total} episode</span><span className="font-mono font-semibold">{Math.round(progress)}%</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progress === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))' }} /></div></div>;
}

function LinksBlock({ extra, item, onCopy }: { extra: any; item: any; onCopy: () => void }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Link</p>
      <div className="flex gap-2 flex-wrap">
        {extra.mal_url && (
          <a href={extra.mal_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-colors min-h-[36px]">
            <ExternalLink className="w-2.5 h-2.5" />MAL{extra.mal_id ? ` #${extra.mal_id}` : ''}
          </a>
        )}
        {extra.anilist_url && (
          <a href={extra.anilist_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-[10px] font-bold hover:bg-violet-500/20 transition-colors min-h-[36px]">
            <ExternalLink className="w-2.5 h-2.5" />AniList{extra.anilist_id ? ` #${extra.anilist_id}` : ''}
          </a>
        )}
        {item.main_url && !item.streaming_url && (
          <a href={item.main_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors min-h-[44px]">
            <ExternalLink className="w-3.5 h-3.5" />Link Utama
          </a>
        )}
        {item.streaming_url && (
          <>
            <SmartStreamButton
              streamingUrl={item.streaming_url}
              mainUrl={item.main_url}
              episodesWatched={item.episodes_watched}
              totalEpisodes={item.episodes}
              isMovie={!!item.is_movie}
              size="md"
              showLabel
            />
            <button onClick={onCopy} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors min-h-[44px]">
              <Copy className="w-3.5 h-3.5" />Salin
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-border p-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p><p className="text-sm text-foreground leading-relaxed">{text}</p></div>;
}
