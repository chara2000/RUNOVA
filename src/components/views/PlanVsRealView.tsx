'use client';

import React, { useMemo, useState } from 'react';
import { MessageSquare, Sparkles, ArrowRight } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import { DataPagination } from '@/components/common/DataPagination';
import {
  Card,
  Button,
  Badge,
  PageHeader,
  Metric,
  StatCard,
  DataTable,
  ProgressBar,
} from '@/components/ui';

interface PlanVsRealProps {
  onSelectView: (view: string) => void;
}

type LapRow = {
  lap: number;
  pace: string;
  duration_sec: number;
  avg_hr: number;
  cadence_avg: number;
  elevation_gain_m: number;
};

function formatLapTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export const PlanVsRealView: React.FC<PlanVsRealProps> = ({ onSelectView }) => {
  const { planVsReal: data, activities, assignments } = useRunova();
  const recentAct = activities[0];
  const laps: LapRow[] = recentAct?.laps ?? [];
  const score = data.compliance.overall_score;
  const paceFaster = data.compliance.pace_diff_sec < 0;
  const [lapPage, setLapPage] = useState(1);
  const [lapPageSize, setLapPageSize] = useState(8);

  const lapItems = useMemo(() => {
    const start = (lapPage - 1) * lapPageSize;
    return laps.slice(start, start + lapPageSize);
  }, [laps, lapPage, lapPageSize]);

  const linkedAssignments = assignments.filter(
    (a) => a.workout_id === data.workout_id || a.status === 'completed'
  ).length;

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title="Planificado vs Realizado"
        subtitle={`${data.athlete_name} · ${data.workout_title} · ${data.date}${
          linkedAssignments ? ` · ${linkedAssignments} asignaciones` : ''
        }`}
        actions={
          <>
            <Badge tone="volt">Matched · FIT</Badge>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              onClick={() => onSelectView('ai')}
            >
              Analizar con IA
            </Button>
          </>
        }
      />

      {/* Héroe: cumplimiento */}
      <Card hero padding="lg" className="border-[color-mix(in_srgb,var(--volt)_28%,transparent)]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <Metric
            label="Índice de cumplimiento"
            value={score}
            unit="%"
            size="xl"
            comparison={`${data.compliance.hr_adherence}% adherencia FC`}
            comparisonPositive
            meaning="Sesión dentro de tolerancia del plan"
          />
          <div className="w-full sm:max-w-xs space-y-3">
            <ProgressBar
              value={score}
              label="Cumplimiento global"
              valueLabel={`${score}%`}
              color="var(--volt)"
            />
            <ProgressBar
              value={data.compliance.hr_adherence}
              label="Adherencia FC"
              valueLabel={`${data.compliance.hr_adherence}%`}
              color="var(--coral)"
            />
          </div>
        </div>
      </Card>

      {/* Comparación Plan | Real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[var(--texto-secundario)]">
              Plan
            </h2>
            <Badge tone="neutral">Coach Carlos</Badge>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Metric label="Distancia" value={data.planned.distance_km} unit="km" />
            <Metric label="Ritmo objetivo" value={data.planned.pace} />
            <Metric label="Zona FC" value={data.planned.hr_zone} />
            <Metric label="Cadencia" value={data.planned.cadence} unit="spm" />
          </div>
        </Card>

        <Card
          padding="lg"
          className="border-[color-mix(in_srgb,var(--volt)_22%,transparent)]"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[var(--texto-primario)]">
              Real
            </h2>
            <Badge tone="cyan">Garmin 965</Badge>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Metric
              label="Distancia"
              value={data.actual.distance_km}
              unit="km"
              comparison={`+${data.compliance.distance_diff_km} km`}
              comparisonPositive
            />
            <Metric
              label="Ritmo medio"
              value={data.actual.pace}
              comparison={`${data.compliance.pace_diff_sec}s/km`}
              comparisonPositive={paceFaster}
              meaning={paceFaster ? 'Más rápido' : 'Más lento'}
            />
            <Metric
              label="Zona FC"
              value={data.actual.hr_zone}
              comparison={`${data.actual.avg_hr} bpm`}
              comparisonPositive={false}
              meaning="Coral = esfuerzo cardíaco"
            />
            <Metric
              label="Cadencia"
              value={data.actual.cadence}
              unit="spm"
              comparison={`+${data.actual.cadence - data.planned.cadence} spm`}
              comparisonPositive
            />
          </div>
        </Card>
      </div>

      {/* Desviaciones semánticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Distancia"
          value={`+${data.compliance.distance_diff_km}`}
          unit="km"
          accent="volt"
          meaning="Sobre el plan"
          comparisonPositive
        />
        <StatCard
          label="Ritmo"
          value={`${data.compliance.pace_diff_sec}`}
          unit="s/km"
          accent="cyan"
          meaning={paceFaster ? 'Más rápido que objetivo' : 'Más lento que objetivo'}
          comparisonPositive={paceFaster}
        />
        <StatCard
          label="FC media"
          value={data.actual.avg_hr}
          unit="bpm"
          accent="coral"
          meaning="Zona registrada vs plan"
        />
      </div>

      {/* Timeline por sesión / splits */}
      {laps.length > 0 ? (
        <Card padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <p className="rv-caption uppercase tracking-wider mb-1">Timeline de sesión</p>
              <h2 className="text-lg font-display font-bold text-[var(--texto-primario)]">
                Splits por kilómetro
              </h2>
            </div>
            <Badge tone="cyan">{laps.length} laps</Badge>
          </div>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain">
            <DataTable<LapRow>
              rows={lapItems}
              rowKey={(row) => String(row.lap)}
              columns={[
                {
                  key: 'lap',
                  header: 'Km',
                  mono: true,
                  render: (row) => `Km ${row.lap}`,
                },
                {
                  key: 'pace',
                  header: 'Ritmo',
                  mono: true,
                  render: (row) => (
                    <span className="text-[var(--cyan)] font-semibold">{row.pace}</span>
                  ),
                },
                {
                  key: 'time',
                  header: 'Tiempo',
                  mono: true,
                  render: (row) => formatLapTime(row.duration_sec),
                },
                {
                  key: 'hr',
                  header: 'FC',
                  mono: true,
                  render: (row) => (
                    <span className="text-[var(--coral)]">{row.avg_hr} bpm</span>
                  ),
                },
                {
                  key: 'cadence',
                  header: 'Cadencia',
                  mono: true,
                  render: (row) => `${row.cadence_avg} spm`,
                },
                {
                  key: 'elev',
                  header: 'Elev.',
                  mono: true,
                  align: 'right',
                  render: (row) => `+${row.elevation_gain_m}m`,
                },
              ]}
            />
          </div>
          {laps.length > 0 && (
            <div className="mt-4">
              <DataPagination
                currentPage={lapPage}
                totalItems={laps.length}
                pageSize={lapPageSize}
                onPageChange={setLapPage}
                onPageSizeChange={(size) => {
                  setLapPageSize(size);
                  setLapPage(1);
                }}
                pageSizeOptions={[8, 12, 20]}
              />
            </div>
          )}
        </Card>
      ) : null}

      {/* Feedback coach + IA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3 text-[var(--texto-secundario)]">
            <MessageSquare size={16} className="text-[var(--cyan)]" />
            <span className="rv-caption uppercase tracking-wider">Devolución del entrenador</span>
          </div>
          <p className="text-sm text-[var(--texto-primario)] leading-relaxed">
            “{data.feedback}”
          </p>
          <p className="mt-4 pt-3 border-t border-[var(--borde-cristal)] text-xs text-[var(--texto-terciario)] font-mono">
            Coach Carlos Mendoza · 29 Sep · 11:40
          </p>
        </Card>

        <Card
          padding="lg"
          className="border-[color-mix(in_srgb,var(--purple)_28%,transparent)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[var(--purple)]" />
            <span className="rv-caption uppercase tracking-wider text-[var(--purple)]">
              RUNOVA AI
            </span>
          </div>
          <p className="text-sm text-[var(--texto-primario)] leading-relaxed">
            Excelente respuesta cardiovascular en el tramo final (km 7–10). A pesar de subir el
            ritmo a 4:54/km, la FC se mantuvo bajo 168 bpm: adaptación aeróbica sólida.
          </p>
          <div className="mt-4 pt-3 border-t border-[var(--borde-cristal)]">
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              onClick={() => onSelectView('ai')}
            >
              Profundizar con IA
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
