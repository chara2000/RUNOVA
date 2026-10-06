'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

export function CommandPalette({ open, onClose, items }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q) ||
        (i.keywords || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === 'Enter' && filtered[active]) {
        e.preventDefault();
        filtered[active].onSelect();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, filtered, active]);

  const groups = Array.from(new Set(filtered.map((i) => i.group)));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rv-backdrop absolute inset-0 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="Búsqueda rápida"
            className="relative w-full max-w-lg overflow-hidden rounded-[var(--radio-lg)] border border-[var(--borde-fuerte)] bg-[var(--bg-elevado)]/95 backdrop-blur-3xl shadow-[var(--sombra-premium)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--borde-cristal)]">
              <Search size={18} className="text-[var(--brand-primario)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Buscar vistas, acciones…"
                className="flex-1 bg-transparent outline-none text-sm text-[var(--texto-primario)] placeholder:text-[var(--texto-terciario)] font-medium"
                aria-label="Comando"
              />
              <kbd className="hidden sm:inline text-[9px] font-black uppercase tracking-widest text-[var(--texto-terciario)] px-2 py-1 rounded-lg border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] font-display">
                Esc
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--texto-terciario)]">
                  Sin resultados
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group} className="mb-2">
                    <p className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.25em] text-[var(--texto-terciario)] font-display">
                      {group}
                    </p>
                    {filtered
                      .filter((i) => i.group === group)
                      .map((item) => {
                        const idx = filtered.indexOf(item);
                        const isActive = idx === active;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => {
                              item.onSelect();
                              onClose();
                            }}
                            className={cn(
                              'w-full flex items-center justify-between gap-3 px-3 py-3 rounded-2xl text-left transition-colors',
                              isActive
                                ? 'bg-[var(--bg-overlay)] text-[var(--texto-primario)]'
                                : 'text-[var(--texto-secundario)] hover:bg-[var(--bg-overlay)]'
                            )}
                          >
                            <span className="text-sm font-bold font-display uppercase tracking-wide">
                              {item.label}
                            </span>
                            {isActive && (
                              <CornerDownLeft size={14} className="text-[var(--brand-primario)]" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
