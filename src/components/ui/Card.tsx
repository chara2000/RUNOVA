'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hero?: boolean;
  noHover?: boolean;
  delay?: number;
}

const paddingMap = {
  none: '',
  sm: 'p-5',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-10',
};

/** Card base = GlassCard GymCRM (tokens light/dark) */
export function Card({
  padding = 'md',
  hero = false,
  noHover = false,
  delay = 0,
  className,
  children,
  onClick,
  ...props
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
      whileHover={
        noHover || !onClick
          ? noHover
            ? {}
            : { y: -3, transition: { duration: 0.25 } }
          : { y: -4, scale: 1.01, transition: { duration: 0.3 } }
      }
      onClick={onClick}
      className={cn(
        'relative overflow-hidden group transition-all duration-500',
        'bg-[var(--bg-card)] backdrop-blur-[20px]',
        'border border-[var(--borde-cristal)] hover:border-[color-mix(in_srgb,var(--brand-primario)_35%,transparent)]',
        'shadow-[var(--sombra-penumbra)] hover:shadow-[var(--sombra-premium)]',
        hero ? 'rounded-[var(--radio-xl)]' : 'rounded-[var(--radio-lg)]',
        paddingMap[padding],
        onClick && 'cursor-pointer',
        className
      )}
      {...(props as object)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] dark:from-white/[0.05] to-transparent pointer-events-none" />
      <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-black/[0.02] dark:via-white/[0.03] to-transparent group-hover:animate-shimmer pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
