'use client';

import React, { useId, useRef, useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── FilterChip ────────────────────────────────────────────────────────────────

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterChips({ options, value, onChange, className }: FilterChipsProps) {
  return (
    <div
      className={cn('flex flex-wrap gap-1.5', className)}
      role="group"
      aria-label="Filtros"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[10px] font-black uppercase tracking-widest font-display border transition-all duration-200',
              active
                ? 'bg-[var(--brand-primario)]/12 border-[color-mix(in_srgb,var(--brand-primario)_40%,transparent)] text-[var(--brand-primario)]'
                : 'border-[var(--borde-cristal)] text-[var(--texto-terciario)] bg-[var(--bg-overlay)] hover:border-[var(--borde-fuerte)] hover:text-[var(--texto-primario)] hover:bg-[var(--bg-sutil)]'
            )}
          >
            {active && (
              <span
                className="absolute inset-0 rounded-[10px] opacity-10 bg-[var(--brand-primario)] pointer-events-none"
                aria-hidden
              />
            )}
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[9px] font-black font-mono',
                  active
                    ? 'bg-[var(--brand-primario)] text-black'
                    : 'bg-[var(--bg-sutil)] text-[var(--texto-terciario)]'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── SearchInput ───────────────────────────────────────────────────────────────

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
  id,
}: SearchInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={cn(
        'relative flex items-center rounded-[12px] border transition-all duration-200 overflow-hidden',
        focused
          ? 'border-[color-mix(in_srgb,var(--brand-primario)_50%,transparent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-primario)_10%,transparent)] bg-[var(--bg-overlay)]'
          : 'border-[var(--borde-fuerte)] bg-[var(--bg-overlay)]',
        className
      )}
    >
      <Search
        size={15}
        className={cn(
          'absolute left-3.5 shrink-0 transition-colors duration-200',
          focused ? 'text-[var(--brand-primario)]' : 'text-[var(--texto-terciario)]'
        )}
      />
      <input
        ref={inputRef}
        id={id ?? inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent pl-9 pr-9 py-2.5 text-sm text-[var(--texto-primario)] placeholder:text-[var(--texto-terciario)] outline-none font-sans"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 p-1 rounded-lg text-[var(--texto-terciario)] hover:text-[var(--texto-primario)] hover:bg-[var(--bg-sutil)] transition-all"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ─── SelectFilter ──────────────────────────────────────────────────────────────

interface SelectFilterProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  'aria-label'?: string;
}

export function SelectFilter({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
}: SelectFilterProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel ?? 'Filtrar'}
        className={cn(
          'appearance-none w-full pl-3.5 pr-8 py-2.5 rounded-[12px] border border-[var(--borde-fuerte)]',
          'bg-[var(--bg-overlay)] text-sm text-[var(--texto-primario)]',
          'focus:border-[color-mix(in_srgb,var(--brand-primario)_50%,transparent)]',
          'focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-primario)_10%,transparent)]',
          'outline-none transition-all duration-200 cursor-pointer font-sans'
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--texto-terciario)] pointer-events-none"
      />
    </div>
  );
}

// ─── FilterBar (composición completa) ─────────────────────────────────────────

interface FilterBarProps {
  searchSlot?: React.ReactNode;
  chipsSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  resultCount?: number;
  className?: string;
}

export function FilterBar({
  searchSlot,
  chipsSlot,
  rightSlot,
  resultCount,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'rounded-[16px] border border-[var(--borde-cristal)] bg-[var(--bg-overlay)]/80 backdrop-blur-md p-3 space-y-2.5',
        'shadow-[0_2px_12px_rgba(0,0,0,0.04)]',
        className
      )}
    >
      {(searchSlot || rightSlot) && (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">{searchSlot}</div>
          {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
        </div>
      )}

      {chipsSlot && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">{chipsSlot}</div>
          {resultCount !== undefined && (
            <span className="text-[10px] font-mono font-bold text-[var(--texto-terciario)] tabular-nums shrink-0">
              {resultCount} resultado{resultCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ActiveFiltersBar ──────────────────────────────────────────────────────────

interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFiltersBarProps {
  filters: ActiveFilter[];
  onClearAll?: () => void;
  className?: string;
}

export function ActiveFiltersBar({ filters, onClearAll, className }: ActiveFiltersBarProps) {
  if (filters.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <SlidersHorizontal size={12} className="text-[var(--texto-terciario)]" />
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--borde-fuerte)] bg-[var(--bg-sutil)] text-[10px] font-bold uppercase tracking-wider text-[var(--texto-secundario)] font-display"
        >
          {f.label}
          <button
            type="button"
            aria-label={`Quitar filtro ${f.label}`}
            onClick={f.onRemove}
            className="text-[var(--texto-terciario)] hover:text-[var(--peligro)] transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[10px] font-bold uppercase tracking-wider text-[var(--texto-terciario)] hover:text-[var(--peligro)] transition-colors font-display"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}
