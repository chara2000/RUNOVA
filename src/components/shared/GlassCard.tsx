'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  noHover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const padMap = {
  none: '',
  sm: 'p-5',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-10',
};

/** Réplica exacta GlassCard GymCRM Pro — light/dark vía tokens */
export default function GlassCard({
  children,
  className,
  delay = 0,
  noHover = false,
  onClick,
  padding = 'md',
}: GlassCardProps) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={
        noHover
          ? {}
          : {
              y: -4,
              scale: 1.01,
              transition: { duration: 0.3 },
            }
      }
      className={cn(
        'relative overflow-hidden rounded-[var(--radio-lg)]',
        padMap[padding],
        'bg-[var(--bg-card)] backdrop-blur-[20px]',
        'border border-[var(--borde-cristal)] hover:border-[color-mix(in_srgb,var(--brand-primario)_35%,transparent)]',
        'shadow-[var(--sombra-penumbra)] hover:shadow-[var(--sombra-premium)]',
        'group transition-all duration-500',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] dark:from-white/[0.05] to-transparent pointer-events-none" />
      <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-black/[0.02] dark:via-white/[0.03] to-transparent group-hover:animate-shimmer pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export { GlassCard };
