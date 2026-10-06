'use client';

import React, { useMemo, useState } from 'react';
import { useRunova } from '@/context/RunovaContext';
import {
  Card,
  Badge,
  Chip,
  Tabs,
  PageHeader,
  Metric,
  StatCard,
  SimpleLineChart,
  SimpleBarChart,
  Tooltip,
  FilterBar,
  FilterChips,
} from '@/components/ui';

interface PerformanceCenterProps {
  onSelectView: (view: string) => void;
}

type RangeId = '7d' | '30d' | '90d' | '12m';

const RANGE_TABS = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: '12m', label: '12m' },
];

function sliceByRange<T>(points: T[], range: RangeId): T[] {
  if (range === '7d') return points.slice(-7);
  if (range === '30d') return points;
  return points;
}

export const PerformanceCenterView: React.FC<PerformanceCenterProps> = ({
  onSelectView,
}) => {
  const { digitalPoints: DIGITAL_PERFORMANCE_POINTS, evolutionTimeline: EVOLUTION_TIMELINE } =
    useRunova();
  const [range, setRange] = useState<RangeId>('30d');
  const [showEvolution, setShowEvolution] = useState(false);

  const points = useMemo(
    () => sliceByRange(DIGITAL_PERFORMANCE_POINTS, range),
    [range, DIGITAL_PERFORMANCE_POINTS]
  );

  const latest = points[points.length - 1] ?? DIGITAL_PERFORMANCE_POINTS.at(-1);
  const ctl = latest?.fitness_ctl ?? 0;
  const atl = latest?.fatigue_atl ?? 0;
  const tsb = latest?.form_tsb ?? 0;

  const labels = points.map((p) => p.day_label.split(' ')[0]);
  const series = [
    {
      id: 'CTL · Fitness',
      color: 'var(--cyan)',
      values: points.map((p) => p.fitness_ctl),
    },
    {
      id: 'ATL · Fatiga',
      color: 'var(--coral)',
      values: points.map((p) => p.fatigue_atl),
    },
    {
      id: 'TSB · Forma',
      color: 'var(--volt)',
      values: points.map((p) => p.form_tsb),
    },
  ];

  const loadBars = points.map((p, i) => ({
    label: `${p.day_label.split(' ')[0]}-${i}`,
    value: p.mileage_km,
    status:
      p.daily_load === 0
        ? ('rest' as const)
        : p.day_label.startsWith('Hoy')
          ? ('today' as const)
          : ('completed' as const),
  }));

  const tsbMeaning =
    !latest
      ? 'Sin actividades registradas'
      : tsb >= -10 && tsb <= 5
        ? 'Zona óptima de asimilación'
        : tsb < -10
          ? 'Sobrecarga — vigilar recuperación'
          : 'Fresco — listo para pico';

  const phaseLabel =
    !latest ? 'Sin datos' : tsb < -10 ? 'Sobrecarga' : tsb <= 5 ? 'Asimilación' : 'Frescura';

  if (DIGITAL_PERFORMANCE_POINTS.length === 0) {
    return (
      <div className="rv-page space-y-6">
        <PageHeader
          title="Centro de Rendimiento"
          subtitle="Fitness, fatiga y forma (CTL / ATL / TSB)"
        />
        <Card padding="lg" className="text-center py-16 space-y-3">
          <p className="text-lg font-display font-bold text-[var(--texto-primario)]">
            Sin datos de carga aún
          </p>
          <p className="text-sm text-[var(--texto-secundario)] max-w-md mx-auto">
            Cuando el atleta registre actividades, aquí se calculará CTL, ATL y TSB a partir de
            kilometraje y efecto de entrenamiento.
          </p>
          <button
            type="button"
            className="btn-zenith mt-2 h-10 px-4 text-xs"
            onClick={() => onSelectView('inbox')}
          >
            Ir a bandeja de actividades
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title="Centro de Rendimiento"
        subtitle="Fitness, fatiga y forma (CTL / ATL / TSB) con contexto de evolución"
        actions={
          <>
            <Badge tone="cyan">CTL {ctl}</Badge>
            <Badge tone={tsb < -10 ? 'coral' : 'volt'}>TSB {tsb}</Badge>
            <Tooltip content="Modelo impulso-respuesta Banister. No es diagnóstico médico." />
          </>
        }
      />

      {/* Selector de rango */}
      <FilterBar
        chipsSlot={
          <>
            <FilterChips
              value={range}
              onChange={(id) => setRange(id as RangeId)}
              options={[
                { id: '7d', label: '7 días' },
                { id: '30d', label: '30 días' },
                { id: '90d', label: '90 días' },
                { id: '12m', label: '12 meses' },
              ]}
            />
            <button
              type="button"
              aria-pressed={showEvolution}
              onClick={() => setShowEvolution((v) => !v)}
              className={[
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[10px] font-black uppercase tracking-widest font-display border transition-all duration-200',
                showEvolution
                  ? 'bg-[var(--brand-cuaternario)]/12 border-[color-mix(in_srgb,var(--brand-cuaternario)_40%,transparent)] text-[var(--brand-cuaternario)]'
                  : 'border-[var(--borde-cristal)] text-[var(--texto-terciario)] bg-[var(--bg-overlay)] hover:border-[var(--borde-fuerte)] hover:text-[var(--texto-primario)]',
              ].join(' ')}
            >
              ✨ Evolución
            </button>
          </>
        }
      />

      {/* Héroe: TSB actual */}
      <Card hero padding="lg" className="border-[color-mix(in_srgb,var(--volt)_28%,transparent)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
          <Metric
            label="Forma (TSB)"
            value={tsb}
            size="xl"
            comparison={tsbMeaning}
            comparisonPositive={tsb >= -10 && tsb <= 5}
            meaning="CTL − ATL"
          />
          <Metric
            label="Fitness (CTL 42d)"
            value={ctl}
            meaning="Capacidad crónica"
          />
          <Metric
            label="Fatiga (ATL 7d)"
            value={atl}
            comparison="Carga aguda"
            comparisonPositive={false}
            meaning="Recuperación reciente"
          />
        </div>
      </Card>

      {/* Gráfica CTL/ATL/TSB */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <p className="rv-caption uppercase tracking-wider mb-1">Modelo digital</p>
            <h2 className="text-lg font-display font-bold text-[var(--texto-primario)]">
              CTL · ATL · TSB
            </h2>
          </div>
          <p className="text-xs text-[var(--texto-terciario)] font-mono">
            Rango {range} · {points.length} puntos
          </p>
        </div>

        <SimpleLineChart
          labels={labels}
          series={series}
          height={220}
          zones={[
            {
              yMin: -10,
              yMax: 5,
              label: 'Zona óptima TSB',
              color: 'var(--volt)',
            },
            {
              yMin: -25,
              yMax: -10,
              label: 'Zona riesgo',
              color: 'var(--coral)',
            },
          ]}
        />

        <p className="mt-4 text-sm text-[var(--texto-secundario)] leading-relaxed max-w-3xl">
          El fitness (CTL) sube con volumen constante. La fatiga (ATL) reagota en días duros.
          La forma (TSB = CTL − ATL) en franja −10 a +5 suele ser el mejor momento para asimilar
          carga antes de un taper. Baja de −10 avisa sobrecarga.
        </p>
      </Card>

      {/* Carga diaria + KPIs compactos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="lg" className="lg:col-span-2">
          <p className="rv-caption uppercase tracking-wider mb-3">Kilometraje diario</p>
          <SimpleBarChart data={loadBars} showLegend={false} />
        </Card>
        <div className="space-y-4">
          <StatCard
            label="Última carga"
            value={latest?.daily_load ?? 0}
            unit="AU"
            accent="cyan"
            meaning={`${latest?.mileage_km ?? 0} km · ${latest?.day_label ?? '—'}`}
          />
          <StatCard
            label="Fase"
            value={phaseLabel}
            accent="volt"
            meaning="Derivada de TSB actual"
            onClick={() => onSelectView('races')}
          />
        </div>
      </div>

      {/* Evolución colapsable */}
      {showEvolution && (
        <Card padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <p className="rv-caption uppercase tracking-wider mb-1 text-[var(--purple)]">
                RUNOVA Evolution
              </p>
              <h2 className="text-lg font-display font-bold text-[var(--texto-primario)]">
                Progresión
              </h2>
            </div>
          </div>
          {EVOLUTION_TIMELINE.length === 0 ? (
            <p className="text-sm text-[var(--texto-secundario)]">Sin datos de evolución.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {EVOLUTION_TIMELINE.map((ev, idx) => {
                const isLast = idx === EVOLUTION_TIMELINE.length - 1;
                return (
                  <div
                    key={ev.month}
                    className={`p-4 rounded-[var(--radio-md)] border ${
                      isLast
                        ? 'border-[color-mix(in_srgb,var(--volt)_35%,transparent)] bg-[var(--bg-overlay)]'
                        : 'border-[var(--borde-cristal)] bg-[var(--bg-overlay)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-display font-bold text-[var(--texto-primario)]">
                        {ev.month}
                      </span>
                      {isLast ? (
                        <Badge tone="volt">Actual</Badge>
                      ) : (
                        <span className="text-xs text-[var(--texto-terciario)]">Hecho</span>
                      )}
                    </div>
                    <Metric label="VO₂ max" value={ev.vo2_max} unit="ml/kg/min" size="md" />
                    <div className="mt-3 space-y-1 text-xs font-mono text-[var(--texto-secundario)]">
                      <p>
                        Ritmo{' '}
                        <span className="text-[var(--volt)] font-semibold">
                          {ev.pace_min_km}/km
                        </span>
                      </p>
                      <p>
                        Volumen{' '}
                        <span className="text-[var(--cyan)] font-semibold">
                          {ev.volume_km} km/sem
                        </span>
                      </p>
                      <p>
                        FC umbral{' '}
                        <span className="text-[var(--coral)]">{ev.avg_hr_threshold} bpm</span>
                      </p>
                    </div>
                    <p className="mt-3 pt-3 border-t border-[var(--borde-default)] text-xs text-[var(--texto-terciario)] leading-relaxed">
                      {ev.notes}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <p className="text-xs text-[var(--texto-terciario)] font-mono">
        Modelo Banister / Foster ACWR · No constituye diagnóstico médico.
      </p>
    </div>
  );
};
