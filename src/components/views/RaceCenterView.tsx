'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import { DataPagination } from '@/components/common/DataPagination';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Chip,
  Metric,
  ProgressBar,
  DataTable,
  Tabs,
} from '@/components/ui';

interface RaceCenterProps {
  onSelectView: (view: string) => void;
}

function parsePaceToSec(pace: string): number {
  const clean = pace.replace('/km', '').trim();
  const [m, s] = clean.split(':').map(Number);
  return m * 60 + (s || 0);
}

function formatPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const RaceCenterView: React.FC<RaceCenterProps> = ({ onSelectView }) => {
  const { races } = useRunova();
  const [activeRaceId, setActiveRaceId] = useState(races[0]?.id || '');
  const [strategy, setStrategy] = useState('negative');
  const [splitPage, setSplitPage] = useState(1);
  const [splitPageSize, setSplitPageSize] = useState(10);

  const activeRace = races.find((r) => r.id === activeRaceId) || races[0];

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setSplitPage(1);
  }, [activeRaceId, strategy]);

  useEffect(() => {
    if (!activeRace) return;
    const target = new Date(activeRace.event_date).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeRace]);

  const splits = useMemo(() => {
    if (!activeRace) return [];
    const base = parsePaceToSec(activeRace.target_pace);
    const kmTotal = Math.round(activeRace.distance_km);
    return Array.from({ length: kmTotal }, (_, i) => {
      const km = i + 1;
      let paceSec = base;
      if (strategy === 'negative') {
        if (km <= 3) paceSec = base + 4;
        else if (km >= kmTotal - 2) paceSec = base - 6;
      }
      return {
        id: `km-${km}`,
        km,
        pace: `${formatPace(paceSec)}/km`,
        cumulative: formatPace(paceSec * km),
        note:
          strategy === 'negative'
            ? km <= 3
              ? 'Control'
              : km >= kmTotal - 2
                ? 'Remate'
                : 'Crucero'
            : 'Even',
      };
    });
  }, [activeRace, strategy]);

  const splitItems = useMemo(() => {
    const start = (splitPage - 1) * splitPageSize;
    return splits.slice(start, start + splitPageSize);
  }, [splits, splitPage, splitPageSize]);

  if (!activeRace) {
    return (
      <div className="rv-page space-y-6">
        <PageHeader title="Race Center" subtitle="Sin carreras registradas" />
      </div>
    );
  }

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title="Race Center"
        subtitle="Countdown, ritmo objetivo y splits de carrera"
        actions={
          <Button variant="secondary" onClick={() => onSelectView('workouts')}>
            Ver plan
          </Button>
        }
      />

      <Card hero padding="lg" className="border-[color-mix(in_srgb,var(--volt)_30%,transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Badge tone="volt" pulse>
              Objetivo activo
            </Badge>
            <h2 className="mt-3 text-2xl sm:text-4xl font-display font-extrabold text-[var(--texto-primario)] tracking-tight">
              {activeRace.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--texto-secundario)]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-[var(--cyan)]" />
                {activeRace.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} className="text-[var(--volt)]" />
                {activeRace.event_date.split('T')[0]} · 07:00
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Días', val: timeLeft.days },
              { label: 'Horas', val: timeLeft.hours },
              { label: 'Min', val: timeLeft.minutes },
              { label: 'Seg', val: timeLeft.seconds },
            ].map((t) => (
              <div
                key={t.label}
                className="min-w-[64px] rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] px-2 py-3 text-center"
              >
                <div className="rv-data text-2xl font-bold text-[var(--texto-primario)]">
                  {String(t.val).padStart(2, '0')}
                </div>
                <div className="rv-caption mt-1 uppercase">{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5 border-t border-[var(--borde-default)]">
          <Metric label="Objetivo" value={activeRace.target_time} size="md" />
          <Metric
            label="PR"
            value={activeRace.pr_time}
            comparison={`${activeRace.pr_diff_sec}s vs meta`}
            comparisonPositive={(activeRace.pr_diff_sec || 0) < 0}
            size="md"
          />
          <Metric label="Ritmo" value={activeRace.target_pace} size="md" />
          <div>
            <Metric label="Preparación" value={activeRace.preparation_score} unit="%" size="md" />
            <ProgressBar
              className="mt-2"
              value={activeRace.preparation_score}
              color="var(--cyan)"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5 space-y-4">
          <p className="rv-caption uppercase tracking-wider">Calculadora de ritmo</p>
          <Tabs
            tabs={[
              { id: 'negative', label: 'Negative split' },
              { id: 'even', label: 'Even pace' },
            ]}
            activeId={strategy}
            onChange={setStrategy}
          />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-[var(--borde-default)]">
              <span className="text-[var(--texto-secundario)]">Km 1–3</span>
              <span className="rv-data text-[var(--texto-primario)]">
                {strategy === 'negative' ? formatPace(parsePaceToSec(activeRace.target_pace) + 4) : activeRace.target_pace}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--borde-default)]">
              <span className="text-[var(--texto-secundario)]">Km 4–medio</span>
              <span className="rv-data text-[var(--texto-primario)]">{activeRace.target_pace}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[var(--texto-secundario)]">Últimos km</span>
              <span className="rv-data text-[var(--volt)]">
                {strategy === 'negative'
                  ? `${formatPace(parsePaceToSec(activeRace.target_pace) - 6)}/km`
                  : activeRace.target_pace}
              </span>
            </div>
          </div>
          <Metric
            label="Tiempo proyectado"
            value={activeRace.target_time}
            meaning={`${activeRace.training_weeks_left} semanas de preparación`}
          />
        </Card>

        <Card className="lg:col-span-7" padding="none">
          <div className="p-5 border-b border-[var(--borde-default)]">
            <p className="rv-caption uppercase tracking-wider">Tabla de splits</p>
          </div>
          <div className="max-h-[min(55vh,480px)] overflow-y-auto overscroll-contain">
            <DataTable
              columns={[
                { key: 'km', header: 'Km', mono: true, render: (r) => r.km },
                { key: 'pace', header: 'Ritmo', mono: true, render: (r) => r.pace },
                { key: 'cum', header: 'Acumulado', mono: true, render: (r) => r.cumulative },
                { key: 'note', header: 'Fase', render: (r) => r.note },
              ]}
              rows={splitItems}
              rowKey={(r) => r.id}
            />
          </div>
          {splits.length > 0 && (
            <div className="p-4 border-t border-[var(--borde-default)]">
              <DataPagination
                currentPage={splitPage}
                totalItems={splits.length}
                pageSize={splitPageSize}
                onPageChange={setSplitPage}
                onPageSizeChange={(size) => {
                  setSplitPageSize(size);
                  setSplitPage(1);
                }}
                pageSizeOptions={[10, 15, 21]}
              />
            </div>
          )}
        </Card>
      </div>

      {activeRace.key_milestones && activeRace.key_milestones.length > 0 && (
        <Card className="space-y-3">
          <p className="rv-caption uppercase tracking-wider">Hitos de preparación</p>
          <div className="space-y-2 max-h-[min(40vh,360px)] overflow-y-auto overscroll-contain pr-1">
            {activeRace.key_milestones.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-2 px-3 rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] mb-2 last:mb-0"
              >
                <span
                  className={
                    m.completed
                      ? 'text-sm text-[var(--texto-primario)]'
                      : 'text-sm text-[var(--texto-secundario)]'
                  }
                >
                  {m.label}
                </span>
                <Badge tone={m.completed ? 'volt' : 'neutral'}>{m.target_value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {races.length > 1 && (
        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto overscroll-contain">
          {races.map((r) => (
            <Chip
              key={r.id}
              active={r.id === activeRace.id}
              tone="cyan"
              onClick={() => setActiveRaceId(r.id)}
            >
              {r.category} · {r.name.slice(0, 28)}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
};
