'use client';

import React from 'react';
import {
  Calendar,
  Play,
  Inbox,
  GitCompare,
  Gauge,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RunningCycleProgressProps {
  currentStage?:
    | 'planificado'
    | 'entrenado'
    | 'registrado'
    | 'analizado'
    | 'comparado'
    | 'aprendido'
    | 'evolucion';
  onSelectView: (view: string) => void;
  onOpenLive?: () => void;
}

const STEPS = [
  {
    id: 'planificado',
    label: 'Planificado',
    subtitle: 'Sesión 6×800m',
    icon: Calendar,
    view: 'workouts',
    color: 'var(--brand-primario)',
  },
  {
    id: 'entrenado',
    label: 'Entrenado',
    subtitle: 'Live HUD GPS',
    icon: Play,
    view: 'live',
    color: 'var(--brand-primario)',
  },
  {
    id: 'registrado',
    label: 'Registrado',
    subtitle: 'Activity Inbox',
    icon: Inbox,
    view: 'inbox',
    color: 'var(--brand-terciario)',
  },
  {
    id: 'analizado',
    label: 'Analizado',
    subtitle: 'Plan vs Real',
    icon: GitCompare,
    view: 'plan-vs-real',
    color: 'var(--brand-terciario)',
  },
  {
    id: 'comparado',
    label: 'Comparado',
    subtitle: 'Longitudinal',
    icon: Gauge,
    view: 'performance',
    color: 'var(--brand-cuaternario)',
  },
  {
    id: 'aprendido',
    label: 'Aprendido',
    subtitle: 'AI Insight',
    icon: Sparkles,
    view: 'ai',
    color: 'var(--brand-cuaternario)',
  },
  {
    id: 'evolucion',
    label: 'Evolución',
    subtitle: 'VO2 · CTL/TSB',
    icon: TrendingUp,
    view: 'performance',
    color: 'var(--brand-secundario)',
  },
] as const;

/** Ciclo running — tokens GymCRM */
export const RunningCycleProgress: React.FC<RunningCycleProgressProps> = ({
  currentStage = 'entrenado',
  onSelectView,
  onOpenLive,
}) => {
  return (
    <div className="rounded-[var(--radio-lg)] p-5 sm:p-6 border border-[var(--borde-cristal)] bg-[var(--bg-card)] backdrop-blur-xl shadow-[var(--sombra-penumbra)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primario)]/[0.04] to-transparent pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--brand-primario)] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-primario)] font-display">
            Ciclo running intelligence
          </span>
        </div>
        <span className="text-[10px] text-[var(--texto-terciario)] font-medium">
          Clic en cualquier fase para explorar
        </span>
      </div>

      <div className="relative grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = step.id === currentStage;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (step.id === 'entrenado' && onOpenLive) onOpenLive();
                else onSelectView(step.view);
              }}
              className={cn(
                'p-3 rounded-2xl border text-left transition-all group flex flex-col justify-between relative overflow-hidden min-h-[88px]',
                isCurrent
                  ? 'bg-[var(--bg-overlay)] border-[color-mix(in_srgb,var(--brand-primario)_45%,transparent)] shadow-[0_0_20px_rgba(193,244,41,0.12)]'
                  : 'bg-[var(--bg-overlay)]/50 border-[var(--borde-cristal)] hover:border-[var(--borde-fuerte)]'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black font-display text-[var(--texto-terciario)]">
                  0{idx + 1}
                </span>
                <Icon
                  size={14}
                  className="transition-transform group-hover:scale-110"
                  style={{ color: isCurrent ? step.color : 'var(--texto-terciario)' }}
                />
              </div>
              <div>
                <span
                  className={cn(
                    'text-[11px] font-black uppercase tracking-wide font-display block',
                    isCurrent ? 'text-[var(--texto-primario)]' : 'text-[var(--texto-secundario)]'
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-[var(--texto-terciario)] block truncate mt-0.5">
                  {step.subtitle}
                </span>
              </div>
              <div
                className="h-0.5 rounded-full mt-2 transition-all"
                style={{
                  background: isCurrent ? step.color : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
