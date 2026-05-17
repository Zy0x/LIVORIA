import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export type PageSize = 30 | 50 | 100 | 500 | 1000 | 'semua';

export const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 30,      label: '30' },
  { value: 50,      label: '50' },
  { value: 100,     label: '100' },
  { value: 500,     label: '500' },
  { value: 1000,    label: '1000' },
  { value: 'semua', label: 'Semua' },
];

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startItem = pageSize === 'semua' ? 1 : (currentPage - 1) * (pageSize as number) + 1;
  const endItem   = pageSize === 'semua' ? totalItems : Math.min(currentPage * (pageSize as number), totalItems);

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="pagination-container mt-6 pt-4 border-t border-border/40">
      {/* Row 1: Info + Page size */}
      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-between mb-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {pageSize === 'semua'
            ? `Menampilkan semua ${totalItems.toLocaleString('id-ID')} item`
            : <>Menampilkan <span className="font-semibold text-foreground">{startItem.toLocaleString('id-ID')}–{endItem.toLocaleString('id-ID')}</span> dari {totalItems.toLocaleString('id-ID')} item</>}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/80">Per halaman</span>
          <div className="flex p-[3px] rounded-xl bg-muted/50 border border-border/60 backdrop-blur-sm">
            {PAGE_SIZE_OPTIONS.map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => onPageSizeChange(opt.value)}
                className={`pagination-size-btn ${pageSize === opt.value ? 'active' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Page navigator */}
      {pageSize !== 'semua' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="pagination-nav-btn"
            title="Halaman pertama"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-nav-btn"
            title="Halaman sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-0.5 mx-1">
            {getPageNumbers().map((p, i) => (
              <React.Fragment key={i}>
                {p === '...' ? (
                  <span className="w-8 h-8 flex items-center justify-center text-muted-foreground/50 text-xs select-none">•••</span>
                ) : (
                  <button
                    onClick={() => onPageChange(p as number)}
                    className={`pagination-page-btn ${currentPage === p ? 'active' : ''}`}
                  >
                    {p}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-nav-btn"
            title="Halaman berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-nav-btn"
            title="Halaman terakhir"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
