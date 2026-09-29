import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [5, 10, 25, 50],
  className = ''
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, totalItems);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include page 1
      pages.push(1);

      if (safePage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (safePage < totalPages - 2) {
        pages.push('...');
      }

      // Always include last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-600 ${className}`}
    >
      {/* Left: Summary & items per page selector */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 w-full sm:w-auto">
        <span className="text-slate-500">
          Menampilkan <strong className="text-slate-800 font-semibold">{startItem}</strong> -{' '}
          <strong className="text-slate-800 font-semibold">{endItem}</strong> dari{' '}
          <strong className="text-slate-800 font-semibold">{totalItems}</strong> data
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <span className="text-slate-400 text-[11px]">Baris:</span>
            <select
              value={itemsPerPage}
              onChange={e => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1 justify-center w-full sm:w-auto">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          title="Halaman Pertama"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          title="Halaman Sebelumnya"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page Numbers (Desktop) */}
        <div className="hidden sm:flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-semibold transition-colors ${
                  p === safePage
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="px-1 text-slate-400 font-bold">
                {p}
              </span>
            )
          )}
        </div>

        {/* Mobile Page indicator */}
        <span className="sm:hidden px-2 text-xs font-medium text-slate-700">
          Hal {safePage} / {totalPages}
        </span>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          title="Halaman Berikutnya"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          title="Halaman Terakhir"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
