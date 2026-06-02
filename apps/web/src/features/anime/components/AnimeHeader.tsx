import { Plus } from 'lucide-react';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import type { AnimeItem } from '@/lib/types';
import { AnimeImportExportMenu } from './AnimeImportExportMenu';
import { AnimeStats, AnimeHeaderIcon } from './AnimeStats';
import { AnimeTitleLanguageSwitch } from './AnimeTitleLanguageSwitch';

interface AnimeHeaderStats {
  ongoing: number;
  completed: number;
  planned: number;
  movies: number;
  wantToWatch: number;
  watching: number;
  watched: number;
}

interface AnimeHeaderProps {
  animeList: AnimeItem[];
  stats: AnimeHeaderStats;
  watchlistCount: number;
  currentLang: TitleLang;
  onLangChange: (lang: TitleLang) => void;
  onOpenBulkImport: () => void;
  onImportComplete: () => void;
  onAdd: () => void;
}

export function AnimeHeader({
  animeList,
  stats,
  watchlistCount,
  currentLang,
  onLangChange,
  onOpenBulkImport,
  onImportComplete,
  onAdd,
}: AnimeHeaderProps) {
  return (
    <div className="anime-page-header mb-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3">
        <AnimeHeaderIcon />
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">
          Anime &amp; Movie Archive
        </span>
      </div>

      <div className="px-4 pt-1.5 pb-4">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
          <div className="min-w-0">
            <h1 className="page-header leading-tight mb-0.5">Koleksi Anime</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {animeList.length} judul - {stats.movies} movie - {watchlistCount} watchlist
            </p>
          </div>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:w-auto sm:items-center sm:justify-end sm:gap-2">
            <div className="order-1 min-w-0 [&>button]:w-full [&>button]:justify-center sm:contents sm:[&>button]:w-auto">
              <AnimeTitleLanguageSwitch currentLang={currentLang} onLangChange={onLangChange} />
            </div>
            <button
              data-add-trigger="anime"
              onClick={onAdd}
              className="order-2 inline-flex min-w-[92px] items-center justify-center gap-1 xs:gap-1.5 px-3 xs:px-4 sm:px-5 py-1.5 xs:py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-all min-h-[32px] xs:min-h-[36px] sm:min-h-[40px] shrink-0 whitespace-nowrap sm:order-3"
            >
              <Plus className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-[18px] sm:h-[18px] shrink-0" />
              Tambah
            </button>
            <div className="order-3 col-span-2 min-w-0 [&>button]:w-full [&>button]:justify-center sm:order-2 sm:col-span-1 sm:contents sm:[&>button]:w-auto">
              <AnimeImportExportMenu
                data={animeList}
                onImportComplete={onImportComplete}
                onOpenBulkImport={onOpenBulkImport}
              />
            </div>
          </div>
        </div>

        <AnimeStats stats={stats} />
      </div>
    </div>
  );
}
