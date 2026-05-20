import { Plus } from 'lucide-react';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import type { DonghuaItem } from '@/lib/types';
import { DonghuaImportExportMenu } from './DonghuaImportExportMenu';
import { DonghuaStats, DonghuaHeaderIcon } from './DonghuaStats';
import { DonghuaTitleLanguageSwitch } from './DonghuaTitleLanguageSwitch';

interface DonghuaHeaderStats {
  ongoing: number;
  completed: number;
  planned: number;
  movies: number;
  wantToWatch: number;
  watching: number;
  watched: number;
}

interface DonghuaHeaderProps {
  donghuaList: DonghuaItem[];
  stats: DonghuaHeaderStats;
  watchlistCount: number;
  currentLang: TitleLang;
  onLangChange: (lang: TitleLang) => void;
  onOpenBulkImport: () => void;
  onImportComplete: () => void;
  onAdd: () => void;
}

export function DonghuaHeader({
  donghuaList,
  stats,
  watchlistCount,
  currentLang,
  onLangChange,
  onOpenBulkImport,
  onImportComplete,
  onAdd,
}: DonghuaHeaderProps) {
  return (
    <div className="donghua-page-header mb-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3">
        <DonghuaHeaderIcon />
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">
          Donghua &amp; Film Archive
        </span>
      </div>

      <div className="px-4 pt-1.5 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div className="min-w-0">
            <h1 className="page-header leading-tight mb-0.5">Koleksi Donghua</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {donghuaList.length} judul - {stats.movies} film - {watchlistCount} watchlist
            </p>
          </div>
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
            <DonghuaTitleLanguageSwitch currentLang={currentLang} onLangChange={onLangChange} />
            <DonghuaImportExportMenu
              data={donghuaList}
              onImportComplete={onImportComplete}
              onOpenBulkImport={onOpenBulkImport}
            />
            <button
              data-add-trigger="donghua"
              onClick={onAdd}
              className="inline-flex items-center gap-1 xs:gap-1.5 px-3 xs:px-4 sm:px-5 py-1.5 xs:py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-all min-h-[32px] xs:min-h-[36px] sm:min-h-[40px] shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-[18px] sm:h-[18px] shrink-0" />
              Tambah
            </button>
          </div>
        </div>

        <DonghuaStats stats={stats} />
      </div>
    </div>
  );
}
