'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
  <div
    className={cn(
      'animate-pulse rounded-2xl bg-[var(--bg-sutil)] relative overflow-hidden',
      className
    )}
    style={style}
    aria-hidden="true"
  >
    <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-black/[0.04] dark:via-white/[0.06] to-transparent animate-shimmer" />
  </div>
);

export const KpiCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-[var(--radio-lg)] p-6 border border-[var(--borde-cristal)] bg-[var(--bg-card)] shadow-[var(--sombra-penumbra)]"
      >
        <Skeleton className="h-3 w-16 mb-4" />
        <Skeleton className="h-9 w-24 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    ))}
  </div>
);

export const AthleteCardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-[var(--radio-lg)] p-6 border border-[var(--borde-cristal)] bg-[var(--bg-card)] shadow-[var(--sombra-penumbra)]"
      >
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="w-16 h-6 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-12 rounded-2xl" />
        </div>
      </div>
    ))}
  </div>
);

export const WorkoutCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-[var(--radio-lg)] p-6 border border-[var(--borde-cristal)] bg-[var(--bg-card)] shadow-[var(--sombra-penumbra)]"
      >
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-7 w-2/3 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="rounded-[var(--radio-lg)] border border-[var(--borde-cristal)] bg-[var(--bg-card)] overflow-hidden">
    <div className="px-5 py-4 border-b border-[var(--borde-cristal)] bg-[var(--bg-overlay)]">
      <Skeleton className="h-3 w-40" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 px-5 py-4 border-b border-[var(--borde-default)] last:border-0"
      >
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/5" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="rv-page space-y-6" aria-busy="true" aria-label="Cargando">
    <div className="space-y-2">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-48" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Skeleton className="h-56 lg:col-span-3 rounded-[var(--radio-lg)]" />
      <Skeleton className="h-56 lg:col-span-2 rounded-[var(--radio-lg)]" />
    </div>
    <KpiCardSkeleton count={4} />
  </div>
);

export default Skeleton;
