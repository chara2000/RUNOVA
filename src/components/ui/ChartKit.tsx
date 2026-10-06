'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BarPoint {
  label: string;
  value: number;
  status?: 'completed' | 'today' | 'planned' | 'rest';
}

interface SimpleBarChartProps {
  data: BarPoint[];
  maxValue?: number;
  className?: string;
  showLegend?: boolean;
}

const statusColor: Record<string, string> = {
  completed: 'var(--brand-terciario)',
  today: 'var(--brand-primario)',
  planned: 'transparent',
  rest: 'var(--bg-sutil)',
};

export function SimpleBarChart({
  data,
  maxValue,
  className,
  showLegend = true,
}: SimpleBarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('space-y-4', className)}>
      {showLegend && (
        <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-[var(--texto-terciario)] font-display">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--brand-terciario)]" /> Completado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--brand-primario)]" /> Hoy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-[var(--texto-terciario)]" /> Planificado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--bg-sutil)]" /> Descanso
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <div
          className="grid gap-2 sm:gap-3 items-end h-36 min-w-[280px]"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(8, (d.value / max) * 100) : 8;
            const status = d.status || (d.value > 0 ? 'completed' : 'rest');
            const displayLabel = d.label.includes('-') ? d.label.split('-')[0] : d.label;
            return (
              <div key={`${d.label}-${i}`} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="rv-data text-[10px] sm:text-xs text-[var(--texto-terciario)]">
                  {d.value > 0 ? `${d.value}` : '—'}
                </span>
                <div
                  className={cn(
                    'w-full max-w-[40px] rounded-t-xl',
                    status === 'planned' &&
                      'border border-dashed border-[var(--texto-terciario)] bg-[var(--bg-overlay)]'
                  )}
                  style={{
                    height: `${h}%`,
                    background: status === 'planned' ? undefined : statusColor[status],
                    boxShadow:
                      status === 'today'
                        ? '0 0 16px color-mix(in srgb, var(--brand-primario) 35%, transparent)'
                        : undefined,
                  }}
                  title={`${displayLabel}: ${d.value}`}
                />
                <span
                  className={cn(
                    'text-[10px] font-black uppercase tracking-wider font-display',
                    status === 'today'
                      ? 'text-[var(--brand-primario)]'
                      : 'text-[var(--texto-terciario)]'
                  )}
                >
                  {displayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface LinePoint {
  label: string;
  value: number;
}

interface SeriesDef {
  id: string;
  color: string;
  values: number[];
}

interface ZoneDef {
  yMin: number;
  yMax: number;
  label: string;
  color: string;
}

type SimpleLineChartProps =
  | {
      data: LinePoint[];
      color?: string;
      className?: string;
      height?: number;
      labels?: never;
      series?: never;
      zones?: never;
    }
  | {
      labels: string[];
      series: SeriesDef[];
      height?: number;
      className?: string;
      zones?: ZoneDef[];
      data?: never;
      color?: never;
    };

/** SimpleLineChart — modo simple (data) o multi-serie (labels+series+zones) */
export function SimpleLineChart(props: SimpleLineChartProps) {
  if (props.labels && props.series) {
    return (
      <MultiLineChart
        labels={props.labels}
        series={props.series}
        height={props.height ?? 200}
        zones={props.zones}
        className={props.className}
      />
    );
  }

  const data = props.data || [];
  const color = props.color || 'var(--brand-primario)';
  const height = props.height ?? 120;
  const className = props.className;

  if (data.length === 0) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 8;
  const w = 100;
  const h = 100;
  const pts = data
    .map((d, i) => {
      const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - ((d.value - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="rv-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${pad},${h - pad} ${pts} ${w - pad},${h - pad}`}
          fill="url(#rv-line-fill)"
        />
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <span
            key={`${d.label}-${i}`}
            className="text-[9px] font-black uppercase tracking-wider text-[var(--texto-terciario)] font-display"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function MultiLineChart({
  labels,
  series,
  height,
  zones,
  className,
}: {
  labels: string[];
  series: SeriesDef[];
  height: number;
  zones?: ZoneDef[];
  className?: string;
}) {
  const allValues = series.flatMap((s) => s.values);
  const min = Math.min(...allValues, ...(zones?.map((z) => z.yMin) || []));
  const max = Math.max(...allValues, ...(zones?.map((z) => z.yMax) || []));
  const range = max - min || 1;
  const padX = 8;
  const padY = 10;
  const w = 400;
  const h = 160;
  const n = Math.max(labels.length - 1, 1);

  const toX = (i: number) => padX + (i / n) * (w - padX * 2);
  const toY = (v: number) => padY + ((max - v) / range) * (h - padY * 2);

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div className="flex flex-wrap gap-4">
        {series.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest font-display text-[var(--texto-terciario)]"
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            {s.id}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)]/40"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Gráfico de series"
      >
        {zones?.map((z) => {
          const y1 = toY(z.yMax);
          const y2 = toY(z.yMin);
          return (
            <rect
              key={z.label}
              x={padX}
              y={Math.min(y1, y2)}
              width={w - padX * 2}
              height={Math.abs(y2 - y1)}
              fill={z.color}
              opacity={0.08}
            />
          );
        })}

        {/* zero line if in range */}
        {min < 0 && max > 0 && (
          <line
            x1={padX}
            x2={w - padX}
            y1={toY(0)}
            y2={toY(0)}
            stroke="var(--borde-fuerte)"
            strokeWidth="1"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {series.map((s) => {
          const pts = s.values
            .map((v, i) => `${toX(i)},${toY(v)}`)
            .join(' ');
          return (
            <polyline
              key={s.id}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      <div className="flex justify-between px-1 overflow-hidden">
          {labels.map((l, i) =>
          i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1 ? (
            <span
              key={`${l}-${i}`}
              className="text-[9px] font-black uppercase tracking-wider text-[var(--texto-terciario)] font-display"
            >
              {l}
            </span>
          ) : (
            <span key={`${l}-${i}`} className="sr-only">
              {l}
            </span>
          )
        )}
      </div>

      {zones && zones.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {zones.map((z) => (
            <span
              key={z.label}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--texto-secundario)]"
            >
              <span
                className="w-2 h-2 rounded-sm opacity-50"
                style={{ background: z.color }}
              />
              {z.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
