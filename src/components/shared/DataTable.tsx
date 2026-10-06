'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  searchPlaceholder?: string;
  pageSize?: number;
}

/** DataTable GymCRM style — tokens light/dark */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onRowClick,
  title,
  subtitle,
  actions,
  searchPlaceholder = 'Buscar...',
  pageSize = 8,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = React.useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some(
        (val) =>
          val !== null &&
          val !== undefined &&
          String(val).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {title && (
          <div>
            <h3 className="text-xl sm:text-2xl font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--texto-terciario)] font-display mt-1">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-1 max-w-lg gap-3">
          <div className="relative flex-1 group">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--texto-terciario)] group-focus-within:text-[var(--brand-primario)] transition-colors"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="input-zenith pl-11"
            />
          </div>
          {actions}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radio-lg)] border border-[var(--borde-cristal)] bg-[var(--bg-card)] backdrop-blur-xl shadow-[var(--sombra-penumbra)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--borde-cristal)] bg-[var(--bg-overlay)]/80">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--texto-terciario)] font-display"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--borde-default)]">
                      {columns.map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 w-24 rounded-lg bg-[var(--bg-sutil)] animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : paginatedData.map((item, rowIdx) => (
                    <tr
                      key={rowIdx}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        'border-b border-[var(--borde-default)] last:border-0 transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-[var(--bg-overlay)]'
                      )}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          className={cn(
                            'px-5 py-4 text-sm text-[var(--texto-primario)]',
                            col.className
                          )}
                        >
                          {typeof col.accessor === 'function'
                            ? col.accessor(item)
                            : (item[col.accessor] as React.ReactNode)}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredData.length === 0 && (
          <div className="py-16 text-center text-sm text-[var(--texto-terciario)]">
            Sin resultados
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[var(--borde-cristal)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--texto-terciario)] font-display">
              Página {currentPage} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-10 h-10 rounded-xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] inline-flex items-center justify-center text-[var(--texto-secundario)] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-10 h-10 rounded-xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] inline-flex items-center justify-center text-[var(--texto-secundario)] disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
