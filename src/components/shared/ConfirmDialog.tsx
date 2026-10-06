'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, ShieldAlert, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

/** Réplica ConfirmDialog GymCRM Pro */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = {
    danger: {
      border: 'border-[var(--peligro)]/20',
      icon: 'bg-[var(--peligro)]/10 text-[var(--peligro)]',
      btn: 'bg-[var(--peligro)] hover:brightness-110 text-white',
      glow: 'shadow-[0_0_40px_rgba(255,23,68,0.12)]',
    },
    warning: {
      border: 'border-[var(--advertencia)]/20',
      icon: 'bg-[var(--advertencia)]/10 text-[var(--advertencia)]',
      btn: 'bg-[var(--advertencia)] hover:brightness-110 text-black',
      glow: 'shadow-[0_0_40px_rgba(255,171,0,0.12)]',
    },
    info: {
      border: 'border-[var(--brand-primario)]/20',
      icon: 'bg-[var(--brand-primario)]/10 text-[var(--brand-primario)]',
      btn: 'bg-[var(--brand-primario)] hover:brightness-105 text-black',
      glow: 'shadow-[0_0_40px_rgba(193,244,41,0.15)]',
    },
  }[variant];

  const Icon = variant === 'danger' ? Trash2 : variant === 'warning' ? ShieldAlert : AlertTriangle;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="rv-backdrop absolute inset-0 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`w-full max-w-sm relative z-10 rounded-[var(--radio-lg)] bg-[var(--bg-elevado)] border ${colors.border} p-8 ${colors.glow}`}
          >
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[var(--borde-fuerte)] to-transparent rounded-full" />

            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] flex items-center justify-center text-[var(--texto-terciario)] hover:text-[var(--texto-primario)] hover:bg-[var(--bg-sutil)] transition-all"
            >
              <X size={14} />
            </button>

            <div className="flex flex-col items-center text-center gap-5">
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 }}
                className={`w-16 h-16 rounded-[20px] border ${colors.border} ${colors.icon} flex items-center justify-center`}
              >
                <Icon size={28} />
              </motion.div>

              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[var(--texto-terciario)] mb-2 font-display">
                  Confirmación requerida
                </p>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--texto-primario)] mb-2 font-display">
                  {title}
                </h3>
                <p className="text-sm text-[var(--texto-secundario)] font-medium leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex gap-3 w-full mt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 h-11 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] text-[var(--texto-secundario)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--bg-sutil)] hover:text-[var(--texto-primario)] transition-all font-display"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`flex-1 h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 font-display ${colors.btn}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    resolve?: (val: boolean) => void;
  }>({ open: false, title: '', message: '' });

  const confirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      variant?: 'danger' | 'warning' | 'info';
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({ open: true, ...opts, resolve });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
