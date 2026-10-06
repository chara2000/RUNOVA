'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
  accent?: 'primario' | 'secundario' | 'terciario' | 'cuaternario';
  innerClassName?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const accentColors = {
  primario: 'from-[var(--brand-primario)]/15',
  secundario: 'from-[var(--brand-secundario)]/15',
  terciario: 'from-[var(--brand-terciario)]/15',
  cuaternario: 'from-[var(--brand-cuaternario)]/15',
};

const padMap = {
  none: '',
  sm: 'p-5',
  md: 'p-6 sm:p-8',
  lg: 'p-8',
};

/** Réplica PremiumCard GymCRM Pro */
export function PremiumCard({
  children,
  className,
  glow = true,
  hover = true,
  accent = 'primario',
  innerClassName,
  padding = 'none',
}: PremiumCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -5, scale: 1.01 } : {}}
      className={cn(
        'relative overflow-hidden rounded-[var(--radio-lg)] border border-[var(--borde-cristal)] bg-[var(--bg-card)] backdrop-blur-xl transition-all duration-300',
        glow && 'hover:shadow-[var(--sombra-premium)] hover:border-[var(--borde-fuerte)]',
        padMap[padding],
        className
      )}
    >
      <div
        className={cn(
          'absolute -top-24 -right-24 w-48 h-48 blur-[80px] rounded-full pointer-events-none opacity-25 bg-gradient-to-br to-transparent',
          accentColors[accent]
        )}
      />
      <div className={cn('relative z-10', innerClassName)}>{children}</div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
    </motion.div>
  );
}
