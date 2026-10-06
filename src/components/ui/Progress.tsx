'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  meaning?: string;
  color?: string;
  className?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 140,
  stroke = 10,
  label,
  meaning,
  color = 'var(--brand-primario)',
  className,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-sutil)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.23, 1, 0.32, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-black italic text-4xl tracking-tighter text-[var(--texto-primario)] leading-none">
          {Math.round(value)}
        </span>
        {label && <span className="rv-caption mt-1">{label}</span>}
      </div>
      {meaning && (
        <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[var(--texto-primario)] text-center font-display">
          {meaning}
        </p>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  valueLabel?: string;
  color?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  color = 'var(--brand-primario)',
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {(label || valueLabel) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--texto-terciario)] font-display">
              {label}
            </span>
          )}
          {valueLabel && (
            <span className="rv-data text-xs font-bold text-[var(--texto-primario)]">
              {valueLabel}
            </span>
          )}
        </div>
      )}
      <div
        className="h-2.5 w-full rounded-full bg-[var(--bg-sutil)] overflow-hidden border border-[var(--borde-cristal)]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 12px color-mix(in srgb, ${color} 40%, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
