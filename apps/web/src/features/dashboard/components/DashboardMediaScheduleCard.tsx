import { Copy, Film, Tv } from 'lucide-react';

import SmartStreamButton from '@/components/shared/SmartStreamButton';
import type { AnimeItem, DonghuaItem } from '@/lib/types';

interface DashboardMediaScheduleCardProps {
  item: AnimeItem | DonghuaItem;
  type: 'anime' | 'donghua';
  onOpenDetail: (item: AnimeItem | DonghuaItem, type: 'anime' | 'donghua') => void;
  onCopyLink: (url: string) => void;
}

export function DashboardMediaScheduleCard({
  item,
  type,
  onOpenDetail,
  onCopyLink,
}: DashboardMediaScheduleCardProps) {
  const Icon = type === 'anime' ? Tv : Film;
  const colorClass = type === 'anime' ? 'text-info' : 'text-success';
  const hasKnownEps = item.episodes !== undefined && item.episodes > 0;
  const watched = item.episodes_watched || 0;
  const progress = hasKnownEps ? Math.min(100, (watched / item.episodes) * 100) : 0;

  return (
    <div
      key={item.id}
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
      onClick={() => onOpenDetail(item, type)}
    >
      <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        {item.cover_url ? (
          <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${colorClass}`}>
            <Icon className="w-2.5 h-2.5" />{type === 'anime' ? 'Anime' : 'Donghua'}
          </span>
          {hasKnownEps ? (
            <span className="text-[10px] text-muted-foreground">Ep {watched}/{item.episodes}</span>
          ) : watched > 0 ? (
            <span className="text-[10px] text-muted-foreground">{watched} ep</span>
          ) : null}
        </div>
        {hasKnownEps && (
          <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-primary/60 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        {item.streaming_url && (
          <>
            <SmartStreamButton
              streamingUrl={item.streaming_url}
              episodesWatched={item.episodes_watched}
              totalEpisodes={item.episodes}
              isMovie={'is_movie' in item ? !!item.is_movie : false}
              size="sm"
              className="p-2 rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            />
            <button
              onClick={e => { e.stopPropagation(); onCopyLink(item.streaming_url); }}
              className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
