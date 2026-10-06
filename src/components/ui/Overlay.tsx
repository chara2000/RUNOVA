'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Info, X } from 'lucide-react';

interface TabsProps {
  tabs: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex flex-wrap gap-1.5 p-1 rounded-[var(--radio-md)] bg-[var(--bg-overlay)] border border-[var(--borde-cristal)]',
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'min-h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest font-display transition-all',
              active
                ? 'bg-[var(--bg-elevado)] text-[var(--texto-primario)] border border-[var(--borde-fuerte)] shadow-[var(--sombra-umbra)]'
                : 'text-[var(--texto-terciario)] hover:text-[var(--texto-primario)] border border-transparent'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={cn('relative inline-flex', className)} ref={ref}>
      <button
        type="button"
        className="inline-flex items-center justify-center min-h-11 min-w-11 text-[var(--texto-terciario)] hover:text-[var(--texto-secundario)]"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        {children || <Info size={16} />}
      </button>
      {open && (
        <div
          id={id}
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3.5 rounded-2xl bg-[var(--bg-elevado)] border border-[var(--borde-fuerte)] text-xs text-[var(--texto-secundario)] leading-relaxed shadow-[var(--sombra-premium)]"
        >
          {content}
        </div>
      )}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Modal UI = PremiumModal GymCRM visual */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="rv-backdrop absolute inset-0 backdrop-blur-md"
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full overflow-hidden rounded-[var(--radio-xl)] border border-[var(--borde-fuerte)] bg-[var(--bg-elevado)]/95 backdrop-blur-3xl shadow-[var(--sombra-premium)]',
              widths[size]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[var(--brand-primario)]/10 to-transparent pointer-events-none" />
            <div className="relative z-10 p-6 sm:p-10">
              <div className="flex items-start justify-between mb-8 gap-4">
                <div>
                  <h2
                    id={titleId}
                    className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter text-[var(--texto-primario)] mb-2 font-display"
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[var(--texto-terciario)] text-sm font-bold uppercase tracking-widest">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="p-3 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] hover:bg-[var(--bg-sutil)] transition-all shrink-0"
                >
                  <X size={20} className="text-[var(--texto-terciario)]" />
                </button>
              </div>
              <div className="relative max-h-[65vh] overflow-y-auto text-sm text-[var(--texto-secundario)]">
                {children}
              </div>
              {footer && (
                <div className="mt-8 flex flex-wrap justify-end gap-3">{footer}</div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--brand-primario)]/30 to-transparent" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
