import { useRef, useState } from 'react';
import { Star, ExternalLink, Copy, Tv, Film, Heart, MoreVertical, Edit2, Trash2, Eye, Layers, X, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useBackGesture } from '@/hooks/useBackGesture';

interface MediaCardProps {
  id: string;
  title: string;
  coverUrl?: string;
  status: 'on-going' | 'completed' | 'planned';
  genre?: string;
  rating?: number;
  episodes?: number;
  episodesWatched?: number;
  season?: number;
  cour?: string;
  streamingUrl?: string;
  schedule?: string;
  synopsis?: string;
  notes?: string;
  stackCount?: number;
  type: 'anime' | 'donghua' | 'waifu';
  waifuTier?: string;
  waifuSource?: string;
  waifuSourceType?: string;
  onEdit: () => void;
  onDelete: () => void;
  onClick?: () => void;
  onViewStack?: () => void;
}

const statusBadge = (s: string) => s === 'on-going' ? 'badge-ongoing' : s === 'completed' ? 'badge-completed' : 'badge-planned';
const statusLabel = (s: string) => s === 'on-going' ? 'On-Going' : s === 'completed' ? 'Selesai' : 'Direncanakan';

const tierColors: Record<string, string> = {
  S: 'bg-pastel-yellow text-warning font-bold',
  A: 'bg-pastel-green text-success font-bold',
  B: 'bg-pastel-blue text-info font-bold',
  C: 'bg-muted text-muted-foreground font-bold',
};

const dayLabels: Record<string, string> = {
  senin: 'Sen', selasa: 'Sel', rabu: 'Rab', kamis: 'Kam', jumat: 'Jum', sabtu: 'Sab', minggu: 'Min',
};

const genreColorMap: Record<string, string> = {
  'Action': 'bg-destructive/15 text-destructive',
  'Adventure': 'bg-success/15 text-success',
  'Comedy': 'bg-pastel-yellow text-warning',
  'Drama': 'bg-pastel-purple text-primary',
  'Fantasy': 'bg-pastel-blue text-info',
  'Horror': 'bg-destructive/20 text-destructive',
  'Mystery': 'bg-pastel-purple text-primary',
  'Romance': 'bg-pastel-pink text-destructive',
  'Sci-Fi': 'bg-info/15 text-info',
  'Slice of Life': 'bg-pastel-green text-success',
  'Thriller': 'bg-destructive/10 text-destructive',
  'Supernatural': 'bg-pastel-purple text-primary',
  'Mecha': 'bg-muted text-muted-foreground',
  'Sports': 'bg-pastel-orange text-warning',
  'Music': 'bg-pastel-pink text-primary',
  'Psychological': 'bg-pastel-purple text-primary',
  'Historical': 'bg-pastel-yellow text-warning',
  'Military': 'bg-muted text-muted-foreground',
  'School': 'bg-pastel-blue text-info',
  'Shounen': 'bg-info/15 text-info',
  'Shoujo': 'bg-pastel-pink text-destructive',
  'Seinen': 'bg-muted text-muted-foreground',
  'Josei': 'bg-pastel-pink text-primary',
  'Isekai': 'bg-success/15 text-success',
  'Harem': 'bg-pastel-pink text-destructive',
  'Martial Arts': 'bg-pastel-orange text-warning',
  'Cultivation': 'bg-pastel-green text-success',
  'Wuxia': 'bg-pastel-yellow text-warning',
  'Xianxia': 'bg-pastel-blue text-info',
  'Xuanhuan': 'bg-pastel-purple text-primary',
  'Demons': 'bg-destructive/15 text-destructive',
  'Magic': 'bg-pastel-purple text-primary',
  'Super Power': 'bg-pastel-orange text-warning',
  'Ecchi': 'bg-pastel-pink text-destructive',
};

const getGenreColor = (genre: string) => genreColorMap[genre] || 'bg-muted text-muted-foreground';

export default function MediaCard({
  id, title, coverUrl, status, genre, rating, episodes, episodesWatched,
  season, cour, streamingUrl, schedule, synopsis, notes, stackCount = 0, type,
  waifuTier, waifuSource, waifuSourceType,
  onEdit, onDelete, onClick, onViewStack,
}: MediaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false);
  // Stacked card fan effect on hover
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useBackGesture(detailOpen, () => setDetailOpen(false), `media-detail-${id}`);
  useBackGesture(coverPreviewOpen, () => setCoverPreviewOpen(false), `cover-preview-${id}`);

  const copyLink = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (streamingUrl) { navigator.clipboard.writeText(streamingUrl); toast({ title: 'Link disalin!', description: streamingUrl }); }
  };
  const openLink = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (streamingUrl) window.open(streamingUrl, '_blank', 'noopener');
  };
  const handleCardClick = () => { if (onClick) onClick(); else setDetailOpen(true); };
  const handleEdit = () => { setDetailOpen(false); setTimeout(() => onEdit(), 200); };
  const handleDelete = () => { setDetailOpen(false); setTimeout(() => onDelete(), 200); };

  const scheduleArr = schedule ? schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
  const genreArr = genre ? genre.split(',').map(g => g.trim()).filter(Boolean) : [];

  const PlaceholderIcon = type === 'anime' ? Tv : type === 'donghua' ? Film : Heart;
  const isWaifu = type === 'waifu';
  const hasStack = stackCount > 0;

  // Episode display — never show "0"
  const hasKnownEpisodes = episodes !== undefined && episodes > 0;
  const watchedCount = episodesWatched ?? 0;
  const episodeProgress = hasKnownEpisodes ? Math.min(100, (watchedCount / episodes!) * 100) : 0;

  const renderEpisodeInfo = () => {
    if (status === 'on-going') {
      if (hasKnownEpisodes) {
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              <span className="font-semibold text-foreground">{watchedCount}</span>
              <span>/ {episodes} ep</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${episodeProgress}%` }} />
            </div>
          </div>
        );
      }
      if (watchedCount > 0) {
        return (
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <Eye className="w-3 h-3" />
            <span className="font-semibold text-foreground">{watchedCount}</span>
            <span>ep ditonton</span>
          </div>
        );
      }
      return <span className="text-[10px] sm:text-xs text-muted-foreground italic">Eps belum diketahui</span>;
    }
    if (hasKnownEpisodes) return <span className="text-[10px] sm:text-xs text-muted-foreground">{episodes} episode</span>;
    if (watchedCount > 0) return <span className="text-[10px] sm:text-xs text-muted-foreground">{watchedCount} ep ditonton</span>;
    return null;
  };

  const renderDetailEpisode = () => {
    if (hasKnownEpisodes) {
      return (
        <>
          <span className="text-sm font-bold">
            {(status === 'on-going' || status === 'completed') ? `${watchedCount}/${episodes}` : episodes}
          </span>
          {(status === 'on-going' || status === 'completed') && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${episodeProgress}%` }} />
            </div>
          )}
        </>
      );
    }
    if (watchedCount > 0) return <span className="text-sm font-bold">{watchedCount} ep</span>;
    return <span className="text-sm text-muted-foreground">Belum diketahui</span>;
  };

  // ─── Badge layout logic ───────────────────────────────────────────────────
  // Bottom-left: season badge OR schedule days (not both simultaneously — schedule takes priority when on-going)
  // Bottom-right: stack badge (always if stacked)
  // If both schedule and season are needed, stack info takes right, season goes bottom-left only if no schedule
  const showScheduleBottom = status === 'on-going' && scheduleArr.length > 0;
  const showSeasonBadge = !isWaifu && season && season > 0;
  // When schedule is shown at bottom, move season to top-right area (under edit buttons)
  // When no schedule: season at bottom-left

  return (
    <>
      {/* Stack "fan" visual behind card — animated on hover */}
      <div
        className="relative"
        onMouseEnter={() => hasStack && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Fan cards behind */}
        {hasStack && (
          <>
            {stackCount >= 2 && (
              <div
                className="absolute inset-x-3 top-0 bottom-0 rounded-xl bg-card border border-border/60 transition-all duration-300 z-[0]"
                style={{
                  transform: isHovered ? 'rotate(-4deg) translateY(-4px)' : 'rotate(-1.5deg) translateY(-2px)',
                  transformOrigin: 'bottom center',
                  boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : undefined,
                }}
              />
            )}
            <div
              className="absolute inset-x-1.5 top-0 bottom-0 rounded-xl bg-card border border-border/70 transition-all duration-300 z-[1]"
              style={{
                transform: isHovered ? 'rotate(-2deg) translateY(-2px)' : 'rotate(-0.8deg) translateY(-1px)',
                transformOrigin: 'bottom center',
                boxShadow: isHovered ? '0 4px 10px rgba(0,0,0,0.07)' : undefined,
              }}
            />
          </>
        )}

        <div
          ref={cardRef}
          className="media-card group relative bg-card rounded-xl border border-border overflow-hidden cursor-pointer z-[2]"
          style={{
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
            boxShadow: isHovered ? '0 12px 28px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
          }}
          onClick={handleCardClick}
        >
          {/* Desktop hover actions */}
          <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
            <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-md bg-card/90 backdrop-blur-sm hover:bg-accent" title="Edit">
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-md bg-card/90 backdrop-blur-sm hover:bg-destructive/10" title="Hapus">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>

          {/* Mobile menu */}
          <div className="absolute top-2 right-2 md:hidden z-10">
            <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="p-1.5 rounded-md bg-card/90 backdrop-blur-sm">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px] animate-scale-in z-50">
                  <button onClick={e => { e.stopPropagation(); onEdit(); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={e => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                  {onViewStack && (
                    <button onClick={e => { e.stopPropagation(); onViewStack(); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors text-primary">
                      <Layers className="w-3.5 h-3.5" /> Lihat Semua Season
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Cover Image */}
          <div className="relative w-full aspect-[2/3] bg-muted overflow-hidden">
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PlaceholderIcon className="w-12 h-12 text-muted-foreground/20" />
              </div>
            )}

            {/* TOP-LEFT: status/tier badge */}
            <div className="absolute top-2 left-2">
              {isWaifu && waifuTier ? (
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm ${tierColors[waifuTier] || tierColors.C}`}>
                  {waifuTier}
                </span>
              ) : (
                <span className={`${statusBadge(status)} text-[10px] sm:text-xs`}>{statusLabel(status)}</span>
              )}
            </div>

            {/* BOTTOM area — handle badge overlap carefully */}
            {/* When on-going with schedule: show schedule days at bottom-left, stack at bottom-right */}
            {/* When no schedule: show season badge at bottom-left, stack at bottom-right */}

            {/* BOTTOM-LEFT: either schedule days or season */}
            {showScheduleBottom ? (
              // Schedule days row — only at bottom-left, give right margin if stack badge exists
              <div className={`absolute bottom-2 left-2 flex gap-0.5 flex-wrap ${hasStack ? 'max-w-[calc(100%-2rem)]' : 'right-2'}`}>
                {scheduleArr.slice(0, 3).map(day => (
                  <span key={day} className="px-1 py-0.5 rounded bg-info/90 text-[8px] sm:text-[9px] font-bold text-white">
                    {dayLabels[day] || day}
                  </span>
                ))}
                {scheduleArr.length > 3 && (
                  <span className="px-1 py-0.5 rounded bg-info/70 text-[8px] font-bold text-white">+{scheduleArr.length - 3}</span>
                )}
              </div>
            ) : showSeasonBadge ? (
              <div className="absolute bottom-2 left-2">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-card/90 backdrop-blur-sm text-[10px] font-semibold text-foreground">
                  S{season}{cour ? ` · ${cour}` : ''}
                </span>
              </div>
            ) : null}

            {/* BOTTOM-RIGHT: stack badge — always in fixed position, no overlap */}
            {hasStack && onViewStack && (
              <button
                onClick={e => { e.stopPropagation(); onViewStack(); }}
                className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/90 backdrop-blur-sm text-[10px] font-semibold text-primary-foreground hover:bg-primary transition-colors z-10"
              >
                <Layers className="w-3 h-3" /> {stackCount + 1}
              </button>
            )}

            {/* Season badge in TOP-RIGHT area when schedule occupies bottom (only if season visible) */}
            {showScheduleBottom && showSeasonBadge && (
              <div className="absolute top-8 left-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-card/80 backdrop-blur-sm text-[9px] font-semibold text-foreground">
                  S{season}{cour ? ` · ${cour}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="p-2.5 sm:p-3">
            <h3 className="font-semibold text-xs sm:text-sm text-foreground leading-tight line-clamp-2 mb-1.5">{title}</h3>

            {isWaifu ? (
              <>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mb-1.5">{waifuSource || 'Sumber belum diisi'}</p>
                <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full ${waifuSourceType === 'anime' ? 'bg-pastel-blue text-info' : 'bg-pastel-green text-success'}`}>
                  {waifuSourceType === 'anime' ? 'Anime' : 'Donghua'}
                </span>
              </>
            ) : (
              <>
                {genreArr.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-1.5">
                    {genreArr.slice(0, 2).map(g => (
                      <span key={g} className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-medium ${getGenreColor(g)}`}>{g}</span>
                    ))}
                    {genreArr.length > 2 && (
                      <span className="px-1 sm:px-1.5 py-0.5 rounded-md bg-muted text-[8px] sm:text-[10px] text-muted-foreground">+{genreArr.length - 2}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex-1 min-w-0">{renderEpisodeInfo()}</div>
                  {rating !== undefined && rating > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-warning shrink-0">
                      <Star className="w-2.5 sm:w-3 h-2.5 sm:h-3 fill-current" /> {rating}
                    </span>
                  )}
                </div>
                {streamingUrl && (
                  <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-border/50">
                    <button onClick={e => openLink(e)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-info/10 text-info text-[10px] font-medium hover:bg-info/20 transition-colors">
                      <ExternalLink className="w-3 h-3" /> <span className="hidden sm:inline">Tonton</span>
                    </button>
                    <button onClick={e => copyLink(e)} className="flex items-center justify-center px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] hover:bg-accent transition-colors">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cover Preview Modal */}
      <Dialog open={coverPreviewOpen} onOpenChange={setCoverPreviewOpen}>
        <DialogContent className="sm:max-w-lg p-0 bg-transparent border-none shadow-none">
          <div className="relative">
            <button onClick={() => setCoverPreviewOpen(false)} className="absolute -top-10 right-0 p-2 rounded-full bg-card/90 backdrop-blur-sm hover:bg-accent z-10">
              <X className="w-5 h-5" />
            </button>
            {coverUrl && <img src={coverUrl} alt={title} className="w-full max-h-[80vh] object-contain rounded-xl" />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base sm:text-lg leading-tight">{title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {isWaifu
                ? `${waifuSourceType === 'anime' ? 'Anime' : 'Donghua'} · ${waifuSource}`
                : `${statusLabel(status)}${season ? ` · Season ${season}` : ''}${cour ? ` · ${cour}` : ''}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {coverUrl && (
              <div
                className="w-full max-w-[200px] mx-auto aspect-[2/3] rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-border"
                onClick={() => { setDetailOpen(false); setTimeout(() => setCoverPreviewOpen(true), 200); }}
              >
                <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                <p className="text-[10px] text-center text-muted-foreground mt-1">Klik untuk preview besar</p>
              </div>
            )}

            {isWaifu ? (
              <>
                {waifuTier && (
                  <div className="rounded-xl border border-border p-3">
                    <span className="section-subtitle block mb-2">Tier</span>
                    <span className={`px-3 py-1.5 rounded-lg text-sm ${tierColors[waifuTier]}`}>{waifuTier}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border p-3 space-y-3">
                  <span className="section-subtitle block">Statistik</span>
                  <div className="grid grid-cols-2 gap-3">
                    {rating !== undefined && rating > 0 && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <span className="text-[10px] font-medium text-muted-foreground block mb-1">Rating</span>
                        <span className="flex items-center gap-1 text-sm font-bold">
                          <Star className="w-4 h-4 text-warning fill-current" /> {rating}/10
                        </span>
                      </div>
                    )}
                    <div className="rounded-lg bg-muted/50 p-3">
                      <span className="text-[10px] font-medium text-muted-foreground block mb-1">Episode</span>
                      {renderDetailEpisode()}
                    </div>
                  </div>
                </div>

                {genreArr.length > 0 && (
                  <div className="rounded-xl border border-border p-3">
                    <span className="section-subtitle block mb-2">Genre</span>
                    <div className="flex flex-wrap gap-1.5">
                      {genreArr.map(g => (
                        <span key={g} className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getGenreColor(g)}`}>{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                {scheduleArr.length > 0 && (
                  <div className="rounded-xl border border-border p-3">
                    <span className="section-subtitle block mb-2">Jadwal Tayang</span>
                    <div className="flex flex-wrap gap-1.5">
                      {scheduleArr.map(day => (
                        <span key={day} className="px-2.5 py-1 rounded-lg bg-info/10 text-info text-xs font-medium">
                          {dayLabels[day] || day}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {streamingUrl && (
                  <div className="rounded-xl border border-border p-3">
                    <span className="section-subtitle block mb-2">Link Streaming</span>
                    <div className="flex gap-2">
                      <button onClick={() => openLink()} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Buka Link
                      </button>
                      <button onClick={() => copyLink()} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors">
                        <Copy className="w-3.5 h-3.5" /> Salin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {synopsis && (
              <div className="rounded-xl border border-border p-3">
                <span className="section-subtitle block mb-1.5">Sinopsis</span>
                <p className="text-sm leading-relaxed text-foreground">{synopsis}</p>
              </div>
            )}
            {notes && (
              <div className="rounded-xl border border-border p-3">
                <span className="section-subtitle block mb-1.5">Catatan</span>
                <p className="text-sm leading-relaxed text-foreground">{notes}</p>
              </div>
            )}

            {/* View all seasons button if stacked */}
            {onViewStack && (
              <button
                onClick={() => { setDetailOpen(false); setTimeout(() => onViewStack(), 200); }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all"
              >
                <Layers className="w-4 h-4" /> Lihat Semua Season ({stackCount + 1} total)
              </button>
            )}

            <div className="flex gap-2 pt-3 border-t border-border">
              <button onClick={handleEdit} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all min-h-[44px]">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={handleDelete} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all min-h-[44px]">
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}