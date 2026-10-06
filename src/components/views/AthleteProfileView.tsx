'use client';

import React from 'react';
import { Activity, Heart } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Metric,
  ZoneBar,
  Tooltip,
  ProgressBar,
  StatCard,
} from '@/components/ui';

interface AthleteProfileViewProps {
  onSelectView: (view: string) => void;
  onOpenLive: () => void;
}

export const AthleteProfileView: React.FC<AthleteProfileViewProps> = ({
  onSelectView,
  onOpenLive,
}) => {
  const { selectedAthlete: a, goals, devices } = useRunova();
  const personalDevices = devices.filter((d) => !d.is_coach_owned);
  const zones = [
    { label: 'Z1', min: a.zones.zone1.min, max: a.zones.zone1.max, color: 'var(--cyan)' },
    { label: 'Z2', min: a.zones.zone2.min, max: a.zones.zone2.max, color: 'var(--exito)' },
    { label: 'Z3', min: a.zones.zone3.min, max: a.zones.zone3.max, color: 'var(--advertencia)' },
    { label: 'Z4', min: a.zones.zone4.min, max: a.zones.zone4.max, color: 'var(--volt)' },
    { label: 'Z5', min: a.zones.zone5.min, max: a.zones.zone5.max, color: 'var(--coral)' },
  ];

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title={a.full_name}
        subtitle={`${a.level} · ${a.preferred_distance} · ${a.running_years} años`}
        actions={
          <>
            <Button variant="secondary" onClick={() => onSelectView('reports')}>
              Exportar ficha
            </Button>
            <Button leftIcon={<Activity size={16} />} onClick={onOpenLive}>
              Entrenar
            </Button>
          </>
        }
      />

      <Card hero padding="lg" className="border-[color-mix(in_srgb,var(--volt)_25%,transparent)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <img
            src={a.avatar_url}
            alt={a.full_name}
            className="w-20 h-20 rounded-[var(--radio-md)] object-cover border border-[var(--borde-cristal)]"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge tone="volt">{a.level}</Badge>
              <StatusBadge status={a.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Peso" value={a.weight_kg} unit="kg" />
              <Metric label="Estatura" value={a.height_cm} unit="cm" />
              <Metric label="FC máx" value={a.hr_max} unit="bpm" />
              <Metric label="FC reposo" value={a.hr_resting} unit="bpm" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="rv-caption uppercase tracking-wider">VDOT</p>
            <Tooltip content="VDOT (Daniels) estimado a partir del VO₂ máx. del perfil del atleta. No sustituye una prueba de campo calibrada." />
          </div>
          <Metric
            size="xl"
            value={a.vo2_max}
            unit="VDOT"
            meaning={`Fuente: ${a.vo2_max_source} · VO₂ máx ${a.vo2_max} ml/kg/min`}
          />
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--borde-cristal)]">
            <Metric label="Umbral" value={a.threshold_pace} />
            <Metric label="Cadencia" value={a.cadence_target} unit="spm" />
          </div>
        </Card>

        <Card className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-[var(--coral)]" />
            <p className="rv-caption uppercase tracking-wider">Zonas FC (Karvonen)</p>
          </div>
          <ZoneBar zones={zones} />
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="HRV basal" value={a.hrv_baseline_ms ?? '—'} unit="ms" accent="cyan" />
        <StatCard label="SpO₂" value={a.spo2_baseline ?? '—'} unit="%" accent="volt" />
        <StatCard label="Zancada" value={(a.stride_length_cm / 100).toFixed(2)} unit="m" accent="neutral" />
        <StatCard label="ACWR" value={a.acwr} accent={a.acwr > 1.3 ? 'coral' : 'volt'} />
        <StatCard label="Ready" value={a.ready_score} unit="%" accent="cyan" />
        <StatCard label="Cumplimiento" value={a.compliance_rate} unit="%" accent="volt" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <p className="rv-caption uppercase tracking-wider">Objetivos</p>
          <div className="space-y-3 max-h-[320px] overflow-y-auto overscroll-contain pr-1">
            {goals.map((g) => (
              <div key={g.id} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--texto-primario)]">{g.type}</span>
                  <span className="rv-data">{g.progress_pct}%</span>
                </div>
                <ProgressBar value={g.progress_pct} color="var(--volt)" valueLabel={g.target_value} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="rv-caption uppercase tracking-wider">Dispositivos</p>
          <div className="space-y-0 max-h-[280px] overflow-y-auto overscroll-contain pr-1">
            {personalDevices.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 py-2 border-b border-[var(--borde-cristal)] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--texto-primario)]">{d.name}</p>
                  <p className="rv-caption">{d.last_sync_at}</p>
                </div>
                <Badge tone="cyan">{d.battery_level}%</Badge>
              </div>
            ))}
          </div>
          <Button variant="secondary" onClick={() => onSelectView('devices')}>
            Gestionar dispositivos
          </Button>
        </Card>
      </div>

      <Card className="space-y-2">
        <p className="rv-caption uppercase tracking-wider">Marcas personales</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="5K" value={a.records.distance_5k || '—'} />
          <Metric label="10K" value={a.records.distance_10k || '—'} />
          <Metric label="21K" value={a.records.distance_21k || '—'} />
          <Metric label="Más larga" value={a.records.longest_run_km || '—'} unit="km" />
        </div>
      </Card>
    </div>
  );
};
