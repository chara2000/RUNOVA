'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { KpiCardPremium } from '@/components/shared/KpiCardPremium';

type Accent = 'volt' | 'cyan' | 'coral' | 'purple' | 'neutral';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  comparison?: string;
  comparisonPositive?: boolean;
  meaning?: string;
  sparkline?: number[];
  icon?: LucideIcon;
  accent?: Accent;
  className?: string;
  onClick?: () => void;
  delay?: number;
}

const accentMap: Record<Accent, 'lime' | 'cyan' | 'coral' | 'purple'> = {
  volt: 'lime',
  cyan: 'cyan',
  coral: 'coral',
  purple: 'purple',
  neutral: 'lime',
};

/** StatCard → KpiCardPremium GymCRM */
export function StatCard({
  label,
  value,
  unit,
  comparison,
  comparisonPositive = true,
  meaning,
  sparkline,
  icon,
  accent = 'volt',
  className,
  onClick,
  delay,
}: StatCardProps) {
  return (
    <KpiCardPremium
      label={label}
      value={value}
      unit={unit}
      trend={comparison}
      trendPositive={comparisonPositive}
      subtext={meaning}
      sparkline={sparkline}
      icon={icon}
      color={accentMap[accent]}
      className={className}
      onClick={onClick}
      delay={delay}
    />
  );
}
