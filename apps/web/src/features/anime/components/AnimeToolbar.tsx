import { BookmarkPlus, Grid3X3 } from 'lucide-react';
import type { AnimePageTab } from '../types/anime.types';

interface AnimeToolbarProps {
  pageTab: AnimePageTab;
  watchlistCount: number;
  onPageTabChange: (tab: AnimePageTab) => void;
}

export function AnimeToolbar({ pageTab, watchlistCount, onPageTabChange }: AnimeToolbarProps) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl bg-muted/60 w-fit mb-5">
      <button
        onClick={() => onPageTabChange('semua')}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${pageTab === 'semua' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Grid3X3 className="w-4 h-4" />
        <span>Koleksi</span>
      </button>
      <button
        onClick={() => onPageTabChange('watchlist')}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${pageTab === 'watchlist' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <BookmarkPlus className="w-4 h-4" />
        <span>Watchlist</span>
        {watchlistCount > 0 && (
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${pageTab === 'watchlist' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {watchlistCount}
          </span>
        )}
      </button>
    </div>
  );
}
