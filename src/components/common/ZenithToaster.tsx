'use client';

import React from 'react';
import { Toaster, toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export function ZenithToaster() {
  return (
    <Toaster
      position="top-center"
      richColors={false}
      expand
      gap={10}
      offset={20}
      toastOptions={{
        unstyled: true,
        className: 'w-full max-w-md mx-auto',
        duration: 4200,
      }}
    />
  );
}

function ToastShell({
  title,
  description,
  tone,
  label,
  icon,
  onClose,
}: {
  title: string;
  description?: string;
  tone: string;
  label: string;
  icon: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5 rounded-[var(--radio-md)] w-full max-w-md mx-auto backdrop-blur-xl"
      style={{
        background: 'var(--bg-elevado)',
        border: `1px solid color-mix(in srgb, ${tone} 35%, transparent)`,
        boxShadow: 'var(--sombra-premium)',
        color: 'var(--texto-primario)',
      }}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{
          background: `color-mix(in srgb, ${tone} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${tone} 28%, transparent)`,
          color: tone,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[8px] font-black uppercase tracking-[0.22em] px-1.5 py-0.5 rounded-md font-display"
            style={{
              color: tone,
              background: `color-mix(in srgb, ${tone} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${tone} 20%, transparent)`,
            }}
          >
            {label}
          </span>
          <h4 className="text-xs font-display font-black uppercase tracking-wider truncate">
            {title}
          </h4>
        </div>
        {description && (
          <p className="text-xs text-[var(--texto-secundario)] line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-[var(--texto-terciario)] hover:bg-[var(--bg-overlay)] hover:text-[var(--texto-primario)] transition-colors"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export const zenithToast = {
  success: (title: string, description?: string) => {
    toast.custom((t) => (
      <ToastShell
        title={title}
        description={description}
        tone="#C1F429"
        label="Éxito"
        icon={<CheckCircle2 className="w-5 h-5" />}
        onClose={() => toast.dismiss(t)}
      />
    ));
  },
  info: (title: string, description?: string) => {
    toast.custom((t) => (
      <ToastShell
        title={title}
        description={description}
        tone="#18FFC8"
        label="Info"
        icon={<Info className="w-5 h-5" />}
        onClose={() => toast.dismiss(t)}
      />
    ));
  },
  warning: (title: string, description?: string) => {
    toast.custom((t) => (
      <ToastShell
        title={title}
        description={description}
        tone="#FFAB00"
        label="Atención"
        icon={<AlertTriangle className="w-5 h-5" />}
        onClose={() => toast.dismiss(t)}
      />
    ));
  },
  error: (title: string, description?: string) => {
    toast.custom((t) => (
      <ToastShell
        title={title}
        description={description}
        tone="#FF1744"
        label="Error"
        icon={<XCircle className="w-5 h-5" />}
        onClose={() => toast.dismiss(t)}
      />
    ));
  },
};
