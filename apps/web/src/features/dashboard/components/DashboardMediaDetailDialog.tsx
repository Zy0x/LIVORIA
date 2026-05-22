import { ChevronRight, Copy, ExternalLink, Film, Star, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { openExternalUrl } from '@/lib/external';
import type { AnimeItem, DonghuaItem } from '@/lib/types';
import { getMediaStatusLabel } from '../domain/dashboard-display';

interface DashboardMediaDetailDialogProps {
  item: AnimeItem | DonghuaItem | null;
  type: 'anime' | 'donghua';
  onClose: () => void;
  onCopyLink: (url: string) => void;
}

const DAY_NAME_MAP: Record<string, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
};

const GENRE_COLOR_MAP: Record<string, string> = {
  Action: 'bg-destructive/15 text-destructive',
  Adventure: 'bg-success/15 text-success',
  Comedy: 'bg-pastel-yellow text-warning',
  Drama: 'bg-pastel-purple text-primary',
  Fantasy: 'bg-pastel-blue text-info',
  Romance: 'bg-pastel-pink text-destructive',
  'Sci-Fi': 'bg-info/15 text-info',
  'Slice of Life': 'bg-pastel-green text-success',
  Supernatural: 'bg-pastel-purple text-primary',
  'Martial Arts': 'bg-pastel-orange text-warning',
  Cultivation: 'bg-pastel-green text-success',
  Isekai: 'bg-success/15 text-success',
};

const getGenreColor = (genre: string) => GENRE_COLOR_MAP[genre] || 'bg-muted text-muted-foreground';

export function DashboardMediaDetailDialog({
  item,
  type,
  onClose,
  onCopyLink,
}: DashboardMediaDetailDialogProps) {
  const Icon = type === 'anime' ? Tv : Film;
  const genreArr = item?.genre ? item.genre.split(',').map((genre) => genre.trim()).filter(Boolean) : [];
  const scheduleArr = item?.schedule ? item.schedule.split(',').map((day) => day.trim()).filter(Boolean) : [];
  const hasKnownEps = item?.episodes !== undefined && item.episodes > 0;
  const watched = item?.episodes_watched || 0;
  const progress = item && hasKnownEps ? Math.min(100, (watched / item.episodes) * 100) : 0;

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-base sm:text-lg leading-tight">
                {item.title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {getMediaStatusLabel(item.status)}
                {item.season && item.season > 0 ? ` · Season ${item.season}` : ''}
                {item.cour ? ` · ${item.cour}` : ''}
                {' · '}
                <span className={type === 'anime' ? 'text-info' : 'text-success'}>
                  {type === 'anime' ? 'Anime' : 'Donghua'}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {item.cover_url && (
                <div className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-xl overflow-hidden border border-border">
                  <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="rounded-xl border border-border p-3 space-y-2">
                <span className="section-subtitle block">Statistik</span>
                <div className="grid grid-cols-2 gap-3">
                  {item.rating > 0 && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <span className="text-[10px] text-muted-foreground block mb-1">Rating</span>
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <Star className="w-4 h-4 text-warning fill-current" /> {item.rating}/10
                      </span>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted/50 p-3">
                    <span className="text-[10px] text-muted-foreground block mb-1">Episode</span>
                    {hasKnownEps ? (
                      <>
                        <span className="text-sm font-bold">{watched}/{item.episodes}</span>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </>
                    ) : watched > 0 ? (
                      <span className="text-sm font-bold">{watched} ep ditonton</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Belum diketahui</span>
                    )}
                  </div>
                </div>
              </div>

              {genreArr.length > 0 && (
                <div className="rounded-xl border border-border p-3">
                  <span className="section-subtitle block mb-2">Genre</span>
                  <div className="flex flex-wrap gap-1.5">
                    {genreArr.map((genre) => (
                      <span key={genre} className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getGenreColor(genre)}`}>
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {scheduleArr.length > 0 && (
                <div className="rounded-xl border border-border p-3">
                  <span className="section-subtitle block mb-2">Jadwal Tayang</span>
                  <div className="flex flex-wrap gap-1.5">
                    {scheduleArr.map((day) => (
                      <span key={day} className="px-2.5 py-1 rounded-lg bg-info/10 text-info text-xs font-medium">
                        {DAY_NAME_MAP[day] || day}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.streaming_url && (
                <div className="rounded-xl border border-border p-3">
                  <span className="section-subtitle block mb-2">Link Streaming</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openExternalUrl(item.streaming_url)}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors min-h-[44px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka Link
                    </button>
                    <button
                      onClick={() => onCopyLink(item.streaming_url)}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors min-h-[44px]"
                    >
                      <Copy className="w-3.5 h-3.5" /> Salin
                    </button>
                  </div>
                </div>
              )}

              {item.synopsis && (
                <div className="rounded-xl border border-border p-3">
                  <span className="section-subtitle block mb-1.5">Sinopsis</span>
                  <p className="text-sm leading-relaxed">{item.synopsis}</p>
                </div>
              )}

              {item.notes && (
                <div className="rounded-xl border border-border p-3">
                  <span className="section-subtitle block mb-1.5">Catatan</span>
                  <p className="text-sm leading-relaxed">{item.notes}</p>
                </div>
              )}

              <Link
                to={`/${type}`}
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all min-h-[44px]"
              >
                <Icon className="w-4 h-4" />
                Buka halaman {type === 'anime' ? 'Anime' : 'Donghua'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
