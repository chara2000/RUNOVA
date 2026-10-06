'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type BadgeTone = 'volt' | 'cyan' | 'coral' | 'purple' | 'neutral' | 'success' | 'warning';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  pulse?: boolean;
}

const tones: Record<BadgeTone, string> = {
  volt: 'text-[var(--brand-primario)] border-[var(--brand-primario)]/30 bg-[var(--brand-primario)]/8',
  cyan: 'text-[var(--brand-terciario)] border-[var(--brand-terciario)]/30 bg-[var(--brand-terciario)]/8',
  coral: 'text-[var(--brand-secundario)] border-[var(--brand-secundario)]/30 bg-[var(--brand-secundario)]/8',
  purple: 'text-[var(--brand-cuaternario)] border-[var(--brand-cuaternario)]/30 bg-[var(--brand-cuaternario)]/8',
  success: 'text-[var(--exito)] border-[var(--exito)]/30 bg-[var(--exito)]/5',
  warning: 'text-[var(--advertencia)] border-[var(--advertencia)]/30 bg-[var(--advertencia)]/8',
  neutral: 'text-[var(--texto-terciario)] border-[var(--borde-fuerte)] bg-[var(--bg-overlay)]',
};

/** Badge = StatusBadge GymCRM typography */
export function Badge({ children, tone = 'neutral', className, pulse }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest backdrop-blur-md font-display',
        tones[tone],
        className
      )}
    >
      {pulse ? (
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" aria-hidden />
      )}
      {children}
    </span>
  );
}

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tone?: BadgeTone;
}

export function Chip({
  active,
  tone = 'volt',
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-2 min-h-10 px-3.5 rounded-[var(--radio-md)] text-[10px] font-black uppercase tracking-widest font-display border transition-all',
        active
          ? tones[tone]
          : 'border-[var(--borde-cristal)] text-[var(--texto-terciario)] bg-[var(--bg-overlay)] hover:border-[var(--borde-fuerte)] hover:text-[var(--texto-primario)]',
        className
      )}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
}
