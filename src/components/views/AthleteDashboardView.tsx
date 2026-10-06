'use client';

import React, { useMemo, useState } from 'react';
import { Play, Activity, Flame, Clock, Heart, Sparkles, ChevronRight } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import {
  Card,
  Button,
  Badge,
  Chip,
  StatCard,
  ProgressRing,
  ProgressBar,
  SimpleBarChart,
  DataTable,
  Tooltip,
  Modal,
  Metric,
} from '@/components/ui';

interface AthleteDashboardProps {
  onOpenLive: () => void;
  onSelectView: (view: string) => void;
  athleteName?: string;
}

const CYCLE_STEPS = [
  { id: 'planificado', label: 'Planificado', view: 'workouts' },
  { id: 'entrenado', label: 'Entrenado', view: 'live' },
  { id: 'registrado', label: 'Registrado', view: 'inbox' },
  { id: 'analizado', label: 'Analizado', view: 'plan-vs-real' },
  { id: 'comparado', label: 'Comparado', view: 'performance' },
  { id: 'aprendido', label: 'Aprendido', view: 'ai' },
  { id: 'evolucion', label: 'Evolución', view: 'performance' },
];

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function avgPaceLabel(activities: { avg_pace?: string; duration_sec: number; distance_km: number }[]): string {
  const withPace = activities.filter((a) => a.avg_pace && a.avg_pace !== '—');
  if (withPace.length > 0) return withPace[0].avg_pace!;
  const dist = activities.reduce((s, a) => s + a.distance_km, 0);
  const sec = activities.reduce((s, a) => s + a.duration_sec, 0);
  if (dist <= 0 || sec <= 0) return '—';
  const paceSec = sec / dist;
  const mm = Math.floor(paceSec / 60);
  const ss = Math.round(paceSec % 60);
  return `${mm}:${String(ss).padStart(2, '0')}/km`;
}

export const AthleteDashboardView: React.FC<AthleteDashboardProps> = ({
  onOpenLive,
  onSelectView,
  athleteName,
}) => {
  const {
    readiness,
    workouts,
    activities,
    inboxActivities,
    selectedAthlete,
    todayWorkout,
    club,
    coach,
    races,
    devices,
  } = useRunova();
  const [cycleOpen, setCycleOpen] = useState(true);
  const [formulaOpen, setFormulaOpen] = useState(false);

  const nameToUse = athleteName || selectedAthlete?.full_name || 'Atleta';
  const firstName = nameToUse.split(' ')[0];

  const nextWorkout = todayWorkout.id
    ? todayWorkout
    : workouts.find((w) => w.target_date === new Date().toISOString().slice(0, 10)) ||
      workouts[0] ||
      null;

  const nextRace = useMemo(() => {
    const upcoming = races
      .filter((r) => r.status === 'upcoming')
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
    return upcoming[0] || null;
  }, [races]);

  const assignedDevice = useMemo(() => {
    if (selectedAthlete?.assigned_device_id) {
      return devices.find((d) => d.id === selectedAthlete.assigned_device_id) || null;
    }
    return (
      devices.find(
        (d) =>
          d.is_assigned &&
          d.current_athlete_name &&
          selectedAthlete?.full_name &&
          d.current_athlete_name === selectedAthlete.full_name
      ) || null
    );
  }, [devices, selectedAthlete]);

  const weekStats = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + mondayOffset);

    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const isToday = key === now.toISOString().slice(0, 10);
      const dayActs = activities.filter(
        (a) =>
          a.start_time?.slice(0, 10) === key &&
          (!selectedAthlete?.id || a.athlete_id === selectedAthlete.id)
      );
      const km = dayActs.reduce((s, a) => s + (a.distance_km || 0), 0);
      const plannedKm = workouts
        .filter((w) => w.target_date === key)
        .reduce((s, w) => s + (w.total_distance_km || 0), 0);

      let status: 'completed' | 'rest' | 'today' | 'planned' = 'rest';
      if (isToday) status = km > 0 ? 'today' : plannedKm > 0 ? 'today' : 'rest';
      else if (km > 0) status = 'completed';
      else if (d > now && plannedKm > 0) status = 'planned';

      return {
        label: DAY_LABELS[d.getDay()],
        value: Number((km || (status === 'planned' ? plannedKm : 0)).toFixed(1)),
        status,
      };
    });

    const weekActs = activities.filter((a) => {
      const t = a.start_time?.slice(0, 10);
      if (!t) return false;
      if (selectedAthlete?.id && a.athlete_id !== selectedAthlete.id) return false;
      const d = new Date(t);
      return d >= monday && d <= now;
    });

    const distanceKm = Number(weekActs.reduce((s, a) => s + a.distance_km, 0).toFixed(1));
    const sessionsDone = weekActs.length;
    const sessionsPlanned = workouts.filter((w) => {
      const d = w.target_date ? new Date(w.target_date) : null;
      return d && d >= monday && d <= new Date(monday.getTime() + 6 * 86400000);
    }).length;
    const durationSec = weekActs.reduce((s, a) => s + (a.duration_sec || 0), 0);
    const pct =
      sessionsPlanned > 0
        ? Math.round((sessionsDone / sessionsPlanned) * 100)
        : sessionsDone > 0
          ? 100
          : 0;

    return {
      bars,
      distanceKm,
      sessionsDone,
      sessionsPlanned: Math.max(sessionsPlanned, sessionsDone),
      durationSec,
      pct,
      pace: avgPaceLabel(weekActs),
      sparkline: bars.map((b) => b.value),
    };
  }, [activities, workouts, selectedAthlete?.id]);

  const avgCadence = useMemo(() => {
    const recent = activities
      .filter((a) => !selectedAthlete?.id || a.athlete_id === selectedAthlete.id)
      .slice(0, 3)
      .filter((a) => a.avg_cadence && a.avg_cadence > 0);
    if (recent.length === 0) return null;
    return Math.round(recent.reduce((s, a) => s + (a.avg_cadence || 0), 0) / recent.length);
  }, [activities, selectedAthlete?.id]);

  const subtitle = [
    club.name && club.name !== 'Sin club' ? club.name : null,
    coach.id ? `Coach · ${coach.specialty || 'General'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="rv-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[32px] font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)]">
            Hola, {firstName}
          </h1>
          <p className="text-sm text-[var(--texto-secundario)] mt-1 truncate">
            {subtitle || 'Tu panel de entrenamiento'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextRace && (
            <Chip active tone="volt" onClick={() => onSelectView('races')}>
              {nextRace.name} · {nextRace.training_weeks_left}sem
            </Chip>
          )}
          <Chip
            active={inboxActivities.length > 0}
            tone="cyan"
            onClick={() => onSelectView('inbox')}
          >
            Inbox {inboxActivities.length}
          </Chip>
          {assignedDevice && (
            <Chip onClick={() => onSelectView('devices')}>{assignedDevice.model}</Chip>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card
          hero
          padding="lg"
          className="lg:col-span-3 border-[color-mix(in_srgb,var(--volt)_30%,transparent)] flex flex-col justify-between"
        >
          {nextWorkout ? (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge tone="volt" pulse>
                    Próximo entrenamiento
                  </Badge>
                  <span className="rv-caption">
                    {nextWorkout.target_date || 'Sin fecha'}
                  </span>
                </div>
                <p className="rv-caption uppercase tracking-wider mb-1">
                  {nextWorkout.category}
                </p>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--texto-primario)] tracking-tight">
                  {nextWorkout.title}
                </h2>
                <p className="text-sm text-[var(--texto-secundario)] mt-2 max-w-xl leading-relaxed">
                  {nextWorkout.objective || 'Sin objetivo definido.'}
                </p>
                <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[var(--borde-cristal)]">
                  <Metric label="Ritmo" value={nextWorkout.target_pace || '—'} size="md" />
                  <Metric
                    label="Distancia"
                    value={nextWorkout.total_distance_km || 0}
                    unit="km"
                    size="md"
                  />
                  <Metric
                    label="Zona FC"
                    value={nextWorkout.target_hr_zone || '—'}
                    size="md"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => onSelectView('workouts')}
                  className="text-sm text-[var(--texto-secundario)] hover:text-[var(--texto-primario)] inline-flex items-center gap-1 min-h-11"
                >
                  Ver bloques <ChevronRight size={14} />
                </button>
                <Button
                  size="lg"
                  leftIcon={<Play size={16} className="fill-current" />}
                  onClick={onOpenLive}
                >
                  Iniciar LIVE
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-3">
              <p className="text-lg font-display font-bold text-[var(--texto-primario)]">
                Sin entrenamientos planificados
              </p>
              <p className="text-sm text-[var(--texto-secundario)]">
                Cuando haya una sesión asignada, aparecerá aquí.
              </p>
              <Button variant="secondary" onClick={() => onSelectView('workouts')}>
                Ir a workouts
              </Button>
            </div>
          )}
        </Card>

        <Card hero padding="lg" className="lg:col-span-2 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="rv-caption uppercase tracking-wider">Readiness</span>
            <Tooltip content={readiness.formula_explanation} />
          </div>
          <ProgressRing
            value={readiness.score ?? 0}
            meaning={readiness.category_label}
            label="SCORE"
          />
          <div className="w-full space-y-3 mt-5">
            <ProgressBar
              label="Recuperación"
              value={readiness.subscores.recovery.value ?? 0}
              valueLabel={String(readiness.subscores.recovery.value ?? '—')}
              color="var(--coral)"
            />
            <ProgressBar
              label="Carga"
              value={readiness.subscores.load.value ?? 0}
              valueLabel={String(readiness.subscores.load.value ?? '—')}
              color="var(--cyan)"
            />
            <ProgressBar
              label="Tendencia"
              value={readiness.subscores.trend.value ?? 0}
              valueLabel={String(readiness.subscores.trend.value ?? '—')}
              color="var(--purple)"
            />
            <ProgressBar
              label="Sueño"
              value={readiness.subscores.sleep.value ?? 0}
              valueLabel={String(readiness.subscores.sleep.value ?? '—')}
              color="var(--volt)"
            />
          </div>
          <button
            type="button"
            onClick={() => setFormulaOpen(true)}
            className="mt-3 text-xs text-[var(--cyan)] min-h-11"
          >
            Cómo se calcula
          </button>
        </Card>
      </div>

      <Card padding="sm">
        <button
          type="button"
          className="w-full flex items-center justify-between px-2 min-h-11"
          onClick={() => setCycleOpen((v) => !v)}
          aria-expanded={cycleOpen}
        >
          <span className="text-sm font-display font-bold text-[var(--texto-primario)]">
            Ciclo Running Intelligence
          </span>
          <span className="rv-caption">{cycleOpen ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {cycleOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-2 pt-0">
            {CYCLE_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() =>
                  step.view === 'live' ? onOpenLive() : onSelectView(step.view)
                }
                className="min-h-11 px-2 py-2 rounded-2xl text-left border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] hover:border-[var(--borde-fuerte)] transition-colors"
              >
                <span className="rv-caption block">{String(idx + 1).padStart(2, '0')}</span>
                <span className="text-xs font-medium text-[var(--texto-primario)]">
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-display font-bold text-[var(--texto-primario)]">
            Semana en curso
          </h3>
          <Badge tone="volt">{weekStats.pct}% del plan</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <StatCard
            label="Distancia"
            value={String(weekStats.distanceKm)}
            unit="km"
            meaning={weekStats.distanceKm > 0 ? 'Acumulado semanal' : 'Sin km aún'}
            accent="volt"
            icon={Activity}
            sparkline={weekStats.sparkline}
          />
          <StatCard
            label="Sesiones"
            value={String(weekStats.sessionsDone)}
            unit={`/${weekStats.sessionsPlanned}`}
            meaning={
              weekStats.sessionsPlanned > weekStats.sessionsDone
                ? `${weekStats.sessionsPlanned - weekStats.sessionsDone} restante(s)`
                : 'Al día'
            }
            accent="cyan"
            icon={Flame}
            sparkline={weekStats.sparkline}
          />
          <StatCard
            label="Tiempo"
            value={formatDuration(weekStats.durationSec)}
            comparison={weekStats.pace}
            meaning="Ritmo medio"
            accent="neutral"
            icon={Clock}
            sparkline={weekStats.sparkline}
          />
        </div>
        <Card>
          <SimpleBarChart
            data={weekStats.bars}
            maxValue={Math.max(10, ...weekStats.bars.map((b) => b.value), 1)}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-[var(--texto-primario)]">
              Actividades recientes
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onSelectView('import')}>
              Importar
            </Button>
          </div>
          {activities.length === 0 ? (
            <Card padding="lg" className="text-center py-10">
              <p className="text-sm text-[var(--texto-secundario)]">
                Aún no hay actividades. Importa un FIT/GPX o sincroniza un dispositivo.
              </p>
            </Card>
          ) : (
            <DataTable
              rows={activities.slice(0, 4)}
              rowKey={(a) => a.id}
              onRowClick={() => onSelectView('plan-vs-real')}
              columns={[
                {
                  key: 'title',
                  header: 'Sesión',
                  render: (a) => <span className="font-medium">{a.title}</span>,
                },
                {
                  key: 'km',
                  header: 'Km',
                  align: 'right',
                  mono: true,
                  render: (a) => a.distance_km,
                },
                {
                  key: 'pace',
                  header: 'Ritmo',
                  align: 'right',
                  mono: true,
                  render: (a) => a.avg_pace,
                },
                {
                  key: 'hr',
                  header: 'FC',
                  align: 'right',
                  mono: true,
                  render: (a) => (
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Heart size={12} className="text-[var(--coral)]" />
                      {a.avg_heart_rate || '—'}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </div>

        <Card className="lg:col-span-2 border-[color-mix(in_srgb,var(--purple)_30%,transparent)] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[var(--purple)]" />
            <Badge tone="purple">AI Insight</Badge>
          </div>
          {avgCadence ? (
            <>
              <h4 className="text-base font-display font-bold text-[var(--texto-primario)]">
                Cadencia reciente
              </h4>
              <p className="text-sm text-[var(--texto-secundario)] mt-2 leading-relaxed flex-1">
                Cadencia media de{' '}
                <span className="rv-data text-[var(--volt)]">{avgCadence} spm</span> en
                las últimas sesiones registradas.
              </p>
            </>
          ) : (
            <>
              <h4 className="text-base font-display font-bold text-[var(--texto-primario)]">
                Sin insights aún
              </h4>
              <p className="text-sm text-[var(--texto-secundario)] mt-2 leading-relaxed flex-1">
                Cuando haya actividades con cadencia u otras métricas, aquí verás
                recomendaciones basadas en tus datos.
              </p>
            </>
          )}
          <Button
            variant="ghost"
            className="mt-4 self-start text-[var(--purple)]"
            onClick={() => onSelectView('ai')}
          >
            Abrir AI Coach
          </Button>
        </Card>
      </div>

      <Modal
        open={formulaOpen}
        onClose={() => setFormulaOpen(false)}
        title="Algoritmo Readiness"
        footer={
          <Button variant="secondary" onClick={() => setFormulaOpen(false)}>
            Entendido
          </Button>
        }
      >
        <p className="text-sm text-[var(--texto-secundario)] mb-4">
          {readiness.formula_explanation}
        </p>
        <ul className="space-y-2 font-mono text-xs">
          <li className="flex justify-between">
            <span>{readiness.subscores.recovery.label}</span>
            <strong className="text-[var(--volt)]">
              {readiness.subscores.recovery.weight_pct}%
            </strong>
          </li>
          <li className="flex justify-between">
            <span>{readiness.subscores.load.label}</span>
            <strong className="text-[var(--cyan)]">
              {readiness.subscores.load.weight_pct}%
            </strong>
          </li>
          <li className="flex justify-between">
            <span>{readiness.subscores.trend.label}</span>
            <strong className="text-[var(--purple)]">
              {readiness.subscores.trend.weight_pct}%
            </strong>
          </li>
          <li className="flex justify-between">
            <span>{readiness.subscores.sleep.label}</span>
            <strong>{readiness.subscores.sleep.weight_pct}%</strong>
          </li>
        </ul>
        <p className="mt-4 text-xs">{readiness.disclaimer}</p>
      </Modal>
    </div>
  );
};
