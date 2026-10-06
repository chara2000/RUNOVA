'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

const iconSizes = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
};

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

/** Logo SVG RUNOVA PRO — tipografía + marca cinética */
export const RunovaLogo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = false,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const limeId = `runova-grad-lime-${uid}`;
  const cyanId = `runova-grad-cyan-${uid}`;

  return (
    <div className={cn('flex items-center gap-3 select-none', className)}>
      <div className={cn('relative flex items-center justify-center', iconSizes[size])}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(193,244,41,0.35)]"
          aria-hidden
        >
          <path
            d="M18 78L44 26C45.2 23.6 48.8 23.6 50 26L64 54"
            stroke={`url(#${cyanId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          <path
            d="M36 82L62 30C63.2 27.6 66.8 27.6 68 30L84 62"
            stroke={`url(#${limeId})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="82" cy="30" r="6" fill="#C1F429" className="animate-pulse" />
          <defs>
            <linearGradient
              id={limeId}
              x1="36"
              y1="82"
              x2="84"
              y2="30"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#18FFC8" />
              <stop offset="0.5" stopColor="#C1F429" />
              <stop offset="1" stopColor="#E2FF66" />
            </linearGradient>
            <linearGradient
              id={cyanId}
              x1="18"
              y1="78"
              x2="64"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#7B61FF" />
              <stop offset="1" stopColor="#18FFC8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'font-display font-black italic tracking-tighter uppercase text-[var(--texto-primario)] leading-none',
                textSizes[size]
              )}
            >
              RUN<span className="text-[var(--brand-primario)]">OVA</span>
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--brand-primario)] bg-[color-mix(in_srgb,var(--brand-primario)_12%,transparent)] border border-[color-mix(in_srgb,var(--brand-primario)_30%,transparent)] rounded-[var(--radio-sm)]">
              PRO
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[9px] tracking-[0.25em] uppercase text-[var(--texto-terciario)] font-mono font-bold mt-0.5">
              Running Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};
