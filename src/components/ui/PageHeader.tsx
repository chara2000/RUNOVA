'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('rv-page-header', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand-primario)] mb-2 font-display">
            {eyebrow}
          </p>
        )}
        <h1 className="rv-page-title">{title}</h1>
        {subtitle && <p className="rv-page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}

interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-[var(--radio-lg)] border border-[var(--borde-cristal)] bg-[var(--bg-card)] backdrop-blur-xl shadow-[var(--sombra-penumbra)]',
        className
      )}
    >
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-[var(--borde-cristal)] bg-[var(--bg-overlay)]/80">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--texto-terciario)] font-display',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-[var(--borde-default)] last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-[var(--bg-overlay)]'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-5 py-4 text-[var(--texto-primario)]',
                    col.mono && 'rv-data',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
