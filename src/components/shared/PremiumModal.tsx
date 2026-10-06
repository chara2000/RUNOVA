'use client';

import { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumModalProps {
  abierto?: boolean;
  isOpen?: boolean;
  onCerrar?: () => void;
  onClose?: () => void;
  titulo?: string;
  title?: string;
  subtitulo?: string;
  subtitle?: string;
  children: React.ReactNode;
  ancho?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
  colorAcento?: string;
  accentColor?: 'lime' | 'cyan' | 'coral' | 'red' | 'purple' | string;
}

const anchos: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-[95vw]',
};

/** Réplica exacta PremiumModal GymCRM Pro (+ aliases RUNOVA) */
export function PremiumModal(props: PremiumModalProps) {
  const abierto = props.isOpen !== undefined ? props.isOpen : !!props.abierto;
  const onCerrar = props.onClose || props.onCerrar || (() => {});
  const titulo = props.title || props.titulo || '';
  const subtitulo = props.subtitle || props.subtitulo;
  const rawAncho = props.maxWidth || props.ancho || 'md';
  const anchoClase = anchos[rawAncho] || rawAncho;

  const tituloId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const prev = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCerrar();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      prev?.focus();
    };
  }, [abierto, onCerrar]);

  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCerrar}
            className="rv-backdrop absolute inset-0 backdrop-blur-md"
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            aria-describedby={subtitulo ? `${tituloId}-desc` : undefined}
            initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, rotateX: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full overflow-hidden rounded-[var(--radio-xl)] border border-[var(--borde-fuerte)] bg-[var(--bg-elevado)]/95 dark:bg-zinc-900/50 backdrop-blur-3xl shadow-[var(--sombra-premium)]',
              anchoClase
            )}
            style={{ perspective: '1000px' }}
          >
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[var(--brand-primario)]/10 to-transparent pointer-events-none" />

            <div className="relative z-10 p-6 sm:p-10 lg:p-14">
              <div className="flex items-start justify-between mb-8 sm:mb-10 gap-4">
                <div>
                  <h2
                    id={tituloId}
                    className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter text-[var(--texto-primario)] mb-2 font-display"
                  >
                    {titulo}
                  </h2>
                  {subtitulo && (
                    <p
                      id={`${tituloId}-desc`}
                      className="text-[var(--texto-terciario)] text-sm font-bold uppercase tracking-widest"
                    >
                      {subtitulo}
                    </p>
                  )}
                </div>
                <button
                  ref={cerrarRef}
                  type="button"
                  onClick={onCerrar}
                  aria-label="Cerrar modal"
                  className="p-3 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] hover:bg-[var(--bg-sutil)] transition-all group shrink-0"
                >
                  <X
                    size={20}
                    className="text-[var(--texto-terciario)] group-hover:text-[var(--texto-primario)] transition-colors"
                  />
                </button>
              </div>

              <div className="relative max-h-[70vh] overflow-y-auto">
                {props.children}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--brand-primario)]/30 to-transparent" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
