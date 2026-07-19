import { useEffect, useState, type ComponentType } from 'react';
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  Film,
  Layers,
  Star,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import SmartStreamButton from '@/components/shared/SmartStreamButton';

type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';

interface MediaStackDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: any[];
  initialIndex: number;
  mediaType: 'anime' | 'donghua';
  movieBadgeLabel: string;
  tableName: 'anime' | 'donghua';
  statusConfig: Record<string, any>;
  genrePalette: Record<string, string>;
  dayLabels: Record<string, string>;
  getWatchStatus: (item: any) => WatchStatus;
  extractExtra: (item: any) => any;
  extractAltTitles: (item: any) => any;
  formatDuration: (minutes: number) => string;
  formatDurationLong: (minutes: number) => string;
  WatchStatusButton: ComponentType<{ item: any; onUpdate: (item: any, status: WatchStatus) => void }>;
  AlternativeTitlesPanel: ComponentType<any>;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onUpdateWatchStatus: (item: any, newStatus: WatchStatus) => void;
  onCoverClick?: (url: string, title: string) => void;
}

export function MediaStackDetailModal({
  open,
  onOpenChange,
  items,
  initialIndex,
  mediaType,
  movieBadgeLabel,
  tableName,
  statusConfig,
  genrePalette,
  dayLabels,
  getWatchStatus,
  extractExtra,
  extractAltTitles,
  formatDuration,
  formatDurationLong,
  WatchStatusButton,
  AlternativeTitlesPanel,
  onEdit,
  onDelete,
  onUpdateWatchStatus,
  onCoverClick,
}: MediaStackDetailModalProps) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    setIdx(initialIndex);
  }, [open, initialIndex]);

  const item = items[idx];
  if (!item) return null;

  const cfg = statusConfig[item.status] || statusConfig.planned;
  const isMovie = item.is_movie;
  const extra = extractExtra(item);
  const genres = item.genre ? item.genre.split(',').map((g: string) => g.trim()).filter(Boolean) : [];
  const schedules = item.schedule ? item.schedule.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const hasKnownEps = item.episodes > 0;
  const watched = item.episodes_watched || 0;
  const progress = hasKnownEps ? Math.min(100, (watched / item.episodes) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base sm:text-lg leading-tight flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            {item.title}
            {isMovie && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20">
                <Film className="w-2.5 h-2.5" />{movieBadgeLabel}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {cfg.label}
            {isMovie ? ' · Movie' : (item.season > 1 ? ` · Season ${item.season}` : '')}
            {item.cour ? ` · ${item.cour}` : ''}
            {extra.studio ? ` · ${extra.studio}` : ''}
            {extra.release_year ? ` · ${extra.release_year}` : ''}
          </DialogDescription>
        </DialogHeader>

        {items.length > 1 && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border">
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
              {items.map((it, i) => (
                <button key={it.id} onClick={() => setIdx(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${i === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {it.is_movie ? movieBadgeLabel : `S${it.season || 1}`}{it.cour ? ` ${it.cour}` : ''}
                </button>
              ))}
            </div>
            <button onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))} disabled={idx === items.length - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}

        <div className="space-y-3 mt-1">
          {item.cover_url && (
            <div className="w-full max-w-[180px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-border shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onClick={() => onCoverClick?.(item.cover_url, item.title)}>
              <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Tonton Saya</p>
            <div className="flex items-center gap-2 flex-wrap">
              <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} />
              <p className="text-[10px] text-muted-foreground">Terpisah dari status rilis</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
              <span className={`w-2 h-2 rounded-full mx-auto block mb-1 ${cfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
              <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Status Rilis</p>
            </div>
            {item.rating > 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto mb-1" />
                <p className="text-sm font-bold">{item.rating}/10</p>
                <p className="text-[9px] text-muted-foreground">Rating</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                {isMovie ? (
                  <>
                    <Film className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400">{item.duration_minutes ? formatDuration(item.duration_minutes) : 'Film'}</p>
                    <p className="text-[9px] text-muted-foreground">Durasi</p>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm font-bold">{hasKnownEps ? `${watched}/${item.episodes}` : watched > 0 ? `${watched} ep` : '-'}</p>
                    <p className="text-[9px] text-muted-foreground">Episode</p>
                  </>
                )}
              </div>
            )}
          </div>

          {!isMovie && hasKnownEps && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{watched} / {item.episodes} episode ditonton</span>
                <span className="font-mono font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: progress === 100 ? 'hsl(var(--success))' : (genrePalette[genres[0]] || 'hsl(var(--primary))') }} />
              </div>
            </div>
          )}

          {(extra.studio || extra.release_year || extra.mal_url || extra.anilist_url || extra.mal_id || extra.anilist_id) && (
            <div className="rounded-xl border border-border p-3 space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Info {mediaType === 'anime' ? 'Anime' : 'Donghua'}</p>
              <div className="grid grid-cols-2 gap-2">
                {extra.release_year && <InfoCell icon={<CalendarClock className="w-3 h-3 text-muted-foreground shrink-0" />} label="Tahun Rilis" value={extra.release_year} />}
                {extra.studio && <InfoCell icon={<Building2 className="w-3 h-3 text-muted-foreground shrink-0" />} label="Studio" value={extra.studio} />}
                {isMovie && item.duration_minutes ? <InfoCell icon={<Clock className="w-3 h-3 text-violet-500 shrink-0" />} label="Durasi" value={formatDurationLong(item.duration_minutes)} valueClassName="text-violet-600 dark:text-violet-400" /> : !isMovie && item.episodes > 0 ? <InfoCell icon={<Eye className="w-3 h-3 text-muted-foreground shrink-0" />} label="Episode" value={`${watched}/${item.episodes}`} /> : null}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {extra.mal_url && <ExternalButton href={extra.mal_url} label={`MAL${extra.mal_id ? ` #${extra.mal_id}` : ''}`} color="blue" />}
                {extra.anilist_url && <ExternalButton href={extra.anilist_url} label={`AniList${extra.anilist_id ? ` #${extra.anilist_id}` : ''}`} color="violet" />}
              </div>
            </div>
          )}

          {genres.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p>
              <div className="flex flex-wrap gap-1.5">
                {genres.map((g: string) => (
                  <span key={g} className="text-[10px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: (genrePalette[g] || '#64748b') + '22', color: genrePalette[g] || 'hsl(var(--muted-foreground))' }}>{g}</span>
                ))}
              </div>
            </div>
          )}

          {schedules.length > 0 && item.status === 'on-going' && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jadwal Tayang</p>
              <div className="flex flex-wrap gap-1.5">{schedules.map((d: string) => <span key={d} className="px-2.5 py-1 rounded-lg bg-info/10 text-info text-[10px] font-semibold border border-info/20">{dayLabels[d] || d}</span>)}</div>
            </div>
          )}

          {(item.streaming_url || item.main_url) && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Link</p>
              <div className="flex gap-2 flex-wrap">
                {item.main_url && !item.streaming_url && (
                  <a href={item.main_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors min-h-[44px]" onClick={e => e.stopPropagation()}><ExternalLink className="w-3.5 h-3.5" /> Link Utama</a>
                )}
                {item.streaming_url && (
                  <>
                    <SmartStreamButton
                      streamingUrl={item.streaming_url}
                      mainUrl={item.main_url}
                      episodesWatched={item.episodes_watched}
                      totalEpisodes={item.episodes}
                      isMovie={isMovie}
                      size="md"
                      showLabel
                    />
                    <button onClick={() => { navigator.clipboard.writeText(item.streaming_url); toast({ title: 'Link disalin!' }); }} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors min-h-[44px]"><Copy className="w-3.5 h-3.5" /> Salin</button>
                  </>
                )}
              </div>
            </div>
          )}

          {item.synopsis && <TextBlock title="Sinopsis" text={item.synopsis} />}
          {item.notes && <TextBlock title="Catatan Pribadi" text={item.notes} />}
          <AlternativeTitlesPanel storedTitle={item.title} altTitles={extractAltTitles(item)} malId={extractExtra(item).mal_id} anilistId={extractExtra(item).anilist_id} mediaType={mediaType} itemId={item.id} tableName={tableName} onFetched={() => {}} />

          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => { onOpenChange(false); setTimeout(() => onEdit(item), 200); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]"><Edit2 className="w-4 h-4" />Edit</button>
            <button onClick={() => { onOpenChange(false); setTimeout(() => onDelete(item), 200); }} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20 min-h-[44px]"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoCell({ icon, label, value, valueClassName = '' }: { icon: JSX.Element; label: string; value: string | number; valueClassName?: string }) {
  return <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">{icon}<div className="min-w-0"><p className="text-[9px] text-muted-foreground">{label}</p><p className={`text-xs font-semibold truncate ${valueClassName}`}>{value}</p></div></div>;
}

function ExternalButton({ href, label, color }: { href: string; label: string; color: 'blue' | 'violet' }) {
  const cls = color === 'blue' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20';
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg ${cls} text-[10px] font-bold transition-colors`} onClick={e => e.stopPropagation()}><ExternalLink className="w-2.5 h-2.5" />{label}</a>;
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-border p-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p><p className="text-sm text-foreground leading-relaxed">{text}</p></div>;
}
