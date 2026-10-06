'use client';

import React, { useState } from 'react';
import {
  Heart,
  Activity,
  TrendingUp,
  Moon,
  AlertTriangle,
  Info,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import { cn } from '@/lib/utils';
import { Badge, Button, Card } from '@/components/ui';

interface ReadinessCardProps {
  className?: string;
}

function SubBar({
  icon: Icon,
  iconColor,
  label,
  unit,
  value,
  barClass,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  iconColor: string;
  label: string;
  unit: string;
  value: number | null;
  barClass: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-[var(--texto-secundario)] flex items-center gap-1.5 font-medium">
          <span style={{ color: iconColor }} className="inline-flex">
            <Icon size={14} />
          </span>
          <span>{label}</span>
          <span className="text-[10px] text-[var(--texto-terciario)]">({unit})</span>
        </span>
        <span
          className={cn(
            'font-black font-display',
            value !== null ? 'text-[var(--texto-primario)]' : 'text-[var(--advertencia)]'
          )}
        >
          {value !== null ? value : 'N/D'}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--bg-sutil)] overflow-hidden border border-[var(--borde-cristal)]">
        {value !== null ? (
          <div style={{ width: `${value}%` }} className={cn('h-full rounded-full', barClass)} />
        ) : (
          <div className="h-full w-full bg-[color-mix(in_srgb,var(--advertencia)_20%,transparent)]" />
        )}
      </div>
    </div>
  );
}

/** Readiness — datos vivos del atleta seleccionado */
export const ReadinessCard: React.FC<ReadinessCardProps> = ({ className = '' }) => {
  const { readiness: data } = useRunova();
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const isLimited = data.is_limited;

  return (
    <Card
      noHover
      className={cn(
        isLimited &&
          'border-[color-mix(in_srgb,var(--advertencia)_35%,transparent)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="rv-caption">RUNOVA Readiness</span>
          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="text-[var(--texto-terciario)] hover:text-[var(--texto-primario)]"
            title="Ver fórmula"
            aria-label="Ver fórmula"
          >
            <Info size={14} />
          </button>
        </div>
        <Badge tone={isLimited ? 'warning' : 'success'} pulse={!isLimited}>
          {data.category_label}
        </Badge>
      </div>

      {data.is_limited ? (
        <div className="my-3 p-4 rounded-2xl bg-[color-mix(in_srgb,var(--advertencia)_8%,transparent)] border border-[color-mix(in_srgb,var(--advertencia)_25%,transparent)]">
          <div className="flex items-center gap-2 text-[var(--advertencia)] mb-1.5">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider font-display">
              Readiness limitado
            </span>
          </div>
          <p className="text-xs text-[var(--texto-secundario)] leading-relaxed">
            {data.missing_factors.length > 0
              ? data.missing_factors.join('. ')
              : 'Faltan métricas suficientes para un índice completo.'}
          </p>
        </div>
      ) : (
        <div className="flex items-baseline gap-4 my-2">
          <span className="text-6xl font-black italic tracking-tighter text-[var(--texto-primario)] font-display leading-none">
            {data.score ?? '—'}
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primario)] font-display">
              Ready score
            </span>
            <span className="text-xs text-[var(--texto-terciario)] mt-0.5">
              Basado en el perfil del atleta
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3.5 mt-5 pt-4 border-t border-[var(--borde-cristal)]">
        <SubBar
          icon={Heart}
          iconColor="var(--brand-secundario)"
          label="Recuperación"
          unit={data.subscores.recovery.unit || '%'}
          value={data.subscores.recovery.value}
          barClass="bg-gradient-to-r from-[var(--exito)] to-[var(--brand-primario)]"
        />
        <SubBar
          icon={Activity}
          iconColor="var(--brand-terciario)"
          label="Carga"
          unit={data.subscores.load.unit || '%'}
          value={data.subscores.load.value}
          barClass="bg-gradient-to-r from-[var(--brand-terciario)] to-[var(--info)]"
        />
        <SubBar
          icon={TrendingUp}
          iconColor="var(--brand-cuaternario)"
          label="Tendencia"
          unit={data.subscores.trend.unit || '%'}
          value={data.subscores.trend.value}
          barClass="bg-gradient-to-r from-[var(--brand-cuaternario)] to-[var(--brand-secundario)]"
        />
        <SubBar
          icon={Moon}
          iconColor="var(--brand-cuaternario)"
          label="Sueño"
          unit={data.subscores.sleep.unit || '%'}
          value={data.subscores.sleep.value}
          barClass="bg-gradient-to-r from-[var(--brand-cuaternario)] to-[var(--brand-terciario)]"
        />
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--borde-cristal)] flex items-center justify-between text-[10px] text-[var(--texto-terciario)]">
        <span className="flex items-center gap-1.5 font-display font-bold uppercase tracking-wider">
          <ShieldAlert size={12} />
          No es diagnóstico médico
        </span>
        <button
          type="button"
          onClick={() => setShowFormulaModal(true)}
          className="text-[var(--brand-terciario)] font-black uppercase tracking-wider font-display hover:underline"
        >
          Transparencia
        </button>
      </div>

      {showFormulaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="rv-backdrop absolute inset-0 backdrop-blur-md"
            onClick={() => setShowFormulaModal(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[var(--radio-lg)] border border-[var(--borde-fuerte)] bg-[var(--bg-elevado)] p-6 sm:p-8 shadow-[var(--sombra-premium)] space-y-4">
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[var(--brand-primario)]/10 to-transparent pointer-events-none" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)]">
                  Algoritmo Readiness
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--texto-terciario)] mt-1 font-display">
                  Fórmula transparente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="p-2.5 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] text-[var(--texto-terciario)]"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-[var(--texto-secundario)] leading-relaxed">
              {data.formula_explanation}
            </p>

            <div className="p-3.5 rounded-2xl bg-[color-mix(in_srgb,var(--advertencia)_10%,transparent)] border border-[color-mix(in_srgb,var(--advertencia)_25%,transparent)] text-xs text-[var(--texto-secundario)]">
              {data.disclaimer}
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="secondary" onClick={() => setShowFormulaModal(false)}>
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
