import React from 'react';

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border/60">
      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {pageSize === 'semua'
            ? `Menampilkan semua ${totalItems} item`
            : `${startItem}–${endItem} dari ${totalItems} item`}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Per halaman:</span>
          <div className="flex gap-0.5 p-0.5 rounded-xl bg-muted/70 border border-border">
            {PAGE_SIZE_OPTIONS.map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => onPageSizeChange(opt.value)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                  pageSize === opt.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pageSize !== 'semua' && totalPages > 1 && (
        <div className="flex items-center gap-1 flex-wrap justify-center">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
            title="Halaman pertama"
          >
            «
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
            title="Halaman sebelumnya"
          >
            ‹
          </button>

          {getPageNumbers().map((p, i) => (
            <React.Fragment key={i}>
              {p === '...' ? (
                <span className="w-8 h-8 flex items-center justify-center text-muted-foreground">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(p as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === p
                      ? 'bg-primary text-primary-foreground shadow-md scale-110 z-10'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              )}
            </React.Fragment>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
            title="Halaman berikutnya"
          >
            ›
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
            title="Halaman terakhir"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
