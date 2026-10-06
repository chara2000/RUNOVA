'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Réplica EmptyState GymCRM Pro */
export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-3xl',
        className
      )}
      style={{ borderColor: 'var(--borde-default)', background: 'var(--bg-sutil)' }}
    >
      {Icon && (
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'var(--bg-elevado)', border: '1px solid var(--borde-default)' }}
        >
          <Icon size={40} style={{ color: 'var(--texto-terciario)' }} />
        </div>
      )}
      <h3
        className="text-xl font-bold mb-2 font-display"
        style={{ color: 'var(--texto-primario)' }}
      >
        {title}
      </h3>
      <p className="text-sm max-w-xs mb-8" style={{ color: 'var(--texto-secundario)' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} leftIcon={<Plus size={18} />}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-[var(--bg-sutil)] relative overflow-hidden',
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-black/[0.04] dark:via-white/[0.06] to-transparent animate-shimmer" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="rv-page space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="h-56 lg:col-span-3 rounded-[var(--radio-lg)]" />
        <Skeleton className="h-56 lg:col-span-2 rounded-[var(--radio-lg)]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-40 rounded-[var(--radio-lg)]" />
        <Skeleton className="h-40 rounded-[var(--radio-lg)]" />
        <Skeleton className="h-40 rounded-[var(--radio-lg)]" />
      </div>
    </div>
  );
}

interface ZoneBarProps {
  zones: { label: string; min: number; max: number; color: string }[];
  className?: string;
}

export function ZoneBar({ zones, className }: ZoneBarProps) {
  const min = Math.min(...zones.map((z) => z.min));
  const max = Math.max(...zones.map((z) => z.max));
  const span = max - min || 1;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-3 rounded-full overflow-hidden border border-[var(--borde-cristal)]">
        {zones.map((z) => (
          <div
            key={z.label}
            style={{ width: `${((z.max - z.min) / span) * 100}%`, background: z.color }}
            title={`${z.label}: ${z.min}–${z.max} bpm`}
            className="h-full"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {zones.map((z) => (
          <div key={z.label} className="text-xs">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full" style={{ background: z.color }} />
              <span className="font-black uppercase tracking-wider text-[10px] text-[var(--texto-primario)] font-display">
                {z.label}
              </span>
            </div>
            <span className="rv-data text-[var(--texto-terciario)]">
              {z.min}–{z.max} bpm
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MetricProps {
  value: string | number;
  unit?: string;
  label?: string;
  comparison?: string;
  comparisonPositive?: boolean;
  meaning?: string;
  size?: 'md' | 'xl';
  className?: string;
}

export function Metric({
  value,
  unit,
  label,
  comparison,
  comparisonPositive = true,
  meaning,
  size = 'md',
  className,
}: MetricProps) {
  return (
    <div className={cn(className)}>
      {label && <p className="rv-caption mb-1">{label}</p>}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)] leading-none',
            size === 'xl' ? 'text-5xl sm:text-[56px]' : 'text-2xl sm:text-3xl'
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono font-bold text-[var(--texto-terciario)]">{unit}</span>
        )}
      </div>
      {(comparison || meaning) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {comparison && (
            <span
              className={cn(
                'font-black font-display',
                comparisonPositive ? 'text-[var(--exito)]' : 'text-[var(--peligro)]'
              )}
            >
              {comparison}
            </span>
          )}
          {meaning && <span className="text-[var(--texto-secundario)]">{meaning}</span>}
        </div>
      )}
    </div>
  );
}
