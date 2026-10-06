'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

const navBtn =
  'p-2 rounded-xl border border-[var(--borde-cristal)] text-[var(--texto-terciario)] hover:text-[var(--texto-primario)] hover:bg-[var(--bg-overlay)] disabled:opacity-30 disabled:pointer-events-none transition-all';

/** Paginación — tokens GymCRM */
export const DataPagination: React.FC<DataPaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 12, 24],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-5 rounded-[var(--radio-md)] bg-[var(--bg-card)] border border-[var(--borde-cristal)] shadow-[var(--sombra-penumbra)] text-xs',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-[var(--texto-secundario)]">
        <span>
          Mostrando{' '}
          <strong className="text-[var(--texto-primario)] font-display">{startItem}</strong> –{' '}
          <strong className="text-[var(--texto-primario)] font-display">{endItem}</strong> de{' '}
          <strong className="text-[var(--brand-primario)] font-display font-black">
            {totalItems}
          </strong>
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--borde-cristal)]">
            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--texto-terciario)] font-display">
              Por pág
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="input-zenith !py-1.5 !px-2.5 !min-h-0 w-auto text-xs cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1} aria-label="Primera" className={navBtn}>
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Anterior"
          className={navBtn}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`e-${idx}`} className="px-1 text-[var(--texto-terciario)] font-display">
                  …
                </span>
              );
            }
            const pageNum = Number(p);
            const isCurrent = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'w-9 h-9 rounded-xl font-display font-black text-xs transition-all',
                  isCurrent
                    ? 'bg-[var(--brand-primario)] text-black shadow-[0_4px_20px_rgba(193,244,41,0.35)]'
                    : 'text-[var(--texto-terciario)] hover:text-[var(--texto-primario)] hover:bg-[var(--bg-overlay)] border border-transparent hover:border-[var(--borde-cristal)]'
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Siguiente"
          className={navBtn}
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Última"
          className={navBtn}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
