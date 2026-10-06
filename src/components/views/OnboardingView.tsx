'use client';

import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthUser } from '@/lib/hooks/useAuth';
import { RunovaLogo } from '@/components/brand/RunovaLogo';
import { Button, Card, Badge, Chip, ProgressBar, ZoneBar } from '@/components/ui';

interface OnboardingViewProps {
  user: AuthUser;
  onComplete: () => void;
}

type StepId = 'personal' | 'physical' | 'goals' | 'availability' | 'preview';

interface OnboardingData {
  date_of_birth: string;
  gender: 'M' | 'F' | 'OTHER';
  weight_kg: number | '';
  height_cm: number | '';
  running_years: number | '';
  level: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Elite';
  hr_max: number | '';
  hr_resting: number | '';
  preferred_distance: '5K' | '10K' | '21K' | '42K' | 'Trail' | 'Ultra';
  goal_type: '5K' | '10K' | '21K' | '42K' | 'Trail' | 'Consistency' | 'Volume';
  goal_target: string;
  goal_date: string;
  days_per_week: number;
  session_duration_min: number;
  training_time: 'morning' | 'afternoon' | 'evening';
}

const STEPS: { id: StepId; title: string; subtitle: string }[] = [
  { id: 'personal', title: 'Datos personales', subtitle: 'Quién eres como atleta' },
  { id: 'physical', title: 'Perfil fisiológico', subtitle: 'FC y zonas Karvonen' },
  { id: 'goals', title: 'Objetivo', subtitle: 'Una meta clara' },
  { id: 'availability', title: 'Disponibilidad', subtitle: 'Cuánto puedes entrenar' },
  { id: 'preview', title: 'Confirmar', subtitle: 'Revisa y activa tu ficha' },
];

function karvonenZones(hrMax: number, hrRest: number) {
  const hrr = Math.max(hrMax - hrRest, 1);
  const zone = (lo: number, hi: number, label: string, color: string) => ({
    label,
    min: Math.round(hrRest + lo * hrr),
    max: Math.round(hrRest + hi * hrr),
    color,
  });
  return [
    zone(0.5, 0.6, 'Z1 Recuperación', '#00E676'),
    zone(0.6, 0.7, 'Z2 Aeróbico', '#18FFC8'),
    zone(0.7, 0.8, 'Z3 Tempo', '#C1F429'),
    zone(0.8, 0.9, 'Z4 Umbral', '#7B61FF'),
    zone(0.9, 1.0, 'Z5 Máxima', '#FF6D6D'),
  ];
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    date_of_birth: '',
    gender: 'M',
    weight_kg: '',
    height_cm: '',
    running_years: '',
    level: 'Principiante',
    hr_max: 190,
    hr_resting: 50,
    preferred_distance: '10K',
    goal_type: '10K',
    goal_target: '',
    goal_date: '',
    days_per_week: 4,
    session_duration_min: 60,
    training_time: 'morning',
  });

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const zones = useMemo(() => {
    const max = Number(data.hr_max) || 190;
    const rest = Number(data.hr_resting) || 50;
    return karvonenZones(max, rest);
  }, [data.hr_max, data.hr_resting]);

  const update = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canNext = () => {
    if (step.id === 'personal') return !!data.level;
    if (step.id === 'physical') return Number(data.hr_max) > Number(data.hr_resting);
    if (step.id === 'goals') return data.goal_target.trim().length > 0;
    return true;
  };

  const saveAndComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (athlete) {
        const { data: hrZones } = await supabase.rpc('calculate_hr_zones', {
          p_hr_max: Number(data.hr_max) || 190,
          p_hr_resting: Number(data.hr_resting) || 50,
        });

        await supabase
          .from('athletes')
          .update({
            full_name: user.full_name,
            date_of_birth: data.date_of_birth || null,
            gender: data.gender,
            weight_kg: Number(data.weight_kg) || null,
            height_cm: Number(data.height_cm) || null,
            running_years: Number(data.running_years) || null,
            level: data.level,
            hr_max: Number(data.hr_max) || null,
            hr_resting: Number(data.hr_resting) || null,
            preferred_distance: data.preferred_distance,
            hr_zones: hrZones ?? {},
            status: 'no_data',
            ready_score: 50,
            acute_load: 0,
            chronic_load: 0,
            acwr: 1.0,
            compliance_rate: 100,
          })
          .eq('id', athlete.id);

        if (data.goal_target) {
          await supabase.from('goals').insert({
            athlete_id: athlete.id,
            type: data.goal_type,
            target_value: data.goal_target,
            current_value: 'Sin datos aún',
            progress_pct: 0,
            target_date:
              data.goal_date ||
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            is_achieved: false,
          });
        }

        await supabase
          .from('onboarding_data')
          .update({
            current_step: 'completed',
            personal_data: {
              date_of_birth: data.date_of_birth,
              gender: data.gender,
              weight_kg: data.weight_kg,
              height_cm: data.height_cm,
            },
            physical_data: {
              hr_max: data.hr_max,
              hr_resting: data.hr_resting,
              preferred_distance: data.preferred_distance,
            },
            goals_data: { type: data.goal_type, target: data.goal_target, date: data.goal_date },
            availability_data: {
              days_per_week: data.days_per_week,
              session_duration_min: data.session_duration_min,
              training_time: data.training_time,
            },
            completed_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true, onboarding_step: 'completed' })
        .eq('id', user.id);

      onComplete();
    } catch (err) {
      console.error('[Onboarding] Error saving:', err);
      setError('No se pudo guardar. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <header className="border-b border-[var(--borde-cristal)] px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <RunovaLogo size="sm" showSubtitle={false} />
          <Badge tone="neutral">
            Paso {stepIndex + 1}/{STEPS.length}
          </Badge>
        </div>
        <div className="max-w-xl mx-auto mt-4">
          <ProgressBar value={progress} label="Progreso" valueLabel={`${Math.round(progress)}%`} />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-4 sm:p-8">
        <Card padding="lg" className="w-full max-w-xl space-y-6">
          <div>
            <h1 className="text-2xl font-display font-extrabold text-[var(--texto-primario)]">
              {step.title}
            </h1>
            <p className="text-sm text-[var(--texto-secundario)] mt-1">{step.subtitle}</p>
          </div>

          {step.id === 'personal' && (
            <div className="space-y-4">
              <label className="block text-sm text-[var(--texto-secundario)]">
                Fecha de nacimiento
                <input
                  type="date"
                  className="input-zenith mt-1.5"
                  value={data.date_of_birth}
                  onChange={(e) => update('date_of_birth', e.target.value)}
                />
              </label>
              <div>
                <p className="text-sm text-[var(--texto-secundario)] mb-2">Género</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'M', label: 'Masculino' },
                      { id: 'F', label: 'Femenino' },
                      { id: 'OTHER', label: 'Otro' },
                    ] as const
                  ).map((g) => (
                    <Chip key={g.id} active={data.gender === g.id} onClick={() => update('gender', g.id)}>
                      {g.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-[var(--texto-secundario)]">
                  Peso (kg)
                  <input
                    type="number"
                    className="input-zenith mt-1.5"
                    value={data.weight_kg}
                    onChange={(e) => update('weight_kg', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </label>
                <label className="block text-sm text-[var(--texto-secundario)]">
                  Altura (cm)
                  <input
                    type="number"
                    className="input-zenith mt-1.5"
                    value={data.height_cm}
                    onChange={(e) => update('height_cm', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-[var(--texto-secundario)] mb-2">Nivel</p>
                <div className="flex flex-wrap gap-2">
                  {(['Principiante', 'Intermedio', 'Avanzado', 'Elite'] as const).map((l) => (
                    <Chip key={l} active={data.level === l} onClick={() => update('level', l)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step.id === 'physical' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-[var(--texto-secundario)]">
                  FC máxima
                  <input
                    type="number"
                    className="input-zenith mt-1.5"
                    value={data.hr_max}
                    onChange={(e) => update('hr_max', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </label>
                <label className="block text-sm text-[var(--texto-secundario)]">
                  FC reposo
                  <input
                    type="number"
                    className="input-zenith mt-1.5"
                    value={data.hr_resting}
                    onChange={(e) =>
                      update('hr_resting', e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--texto-primario)] mb-2">
                  Vista previa zonas Karvonen
                </p>
                <ZoneBar zones={zones} />
              </div>
              <div>
                <p className="text-sm text-[var(--texto-secundario)] mb-2">Distancia preferida</p>
                <div className="flex flex-wrap gap-2">
                  {(['5K', '10K', '21K', '42K', 'Trail', 'Ultra'] as const).map((d) => (
                    <Chip
                      key={d}
                      active={data.preferred_distance === d}
                      onClick={() => update('preferred_distance', d)}
                    >
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step.id === 'goals' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--texto-secundario)] mb-2">Tipo de meta</p>
                <div className="flex flex-wrap gap-2">
                  {(['5K', '10K', '21K', '42K', 'Consistency', 'Volume'] as const).map((t) => (
                    <Chip key={t} active={data.goal_type === t} onClick={() => update('goal_type', t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
              <label className="block text-sm text-[var(--texto-secundario)]">
                Objetivo (ej. Sub-40:00)
                <input
                  className="input-zenith mt-1.5"
                  value={data.goal_target}
                  onChange={(e) => update('goal_target', e.target.value)}
                  placeholder="Sub-40:00 en 10K"
                />
              </label>
              <label className="block text-sm text-[var(--texto-secundario)]">
                Fecha objetivo
                <input
                  type="date"
                  className="input-zenith mt-1.5"
                  value={data.goal_date}
                  onChange={(e) => update('goal_date', e.target.value)}
                />
              </label>
            </div>
          )}

          {step.id === 'availability' && (
            <div className="space-y-4">
              <label className="block text-sm text-[var(--texto-secundario)]">
                Días por semana: <span className="rv-data text-[var(--texto-primario)]">{data.days_per_week}</span>
                <input
                  type="range"
                  min={2}
                  max={7}
                  value={data.days_per_week}
                  onChange={(e) => update('days_per_week', Number(e.target.value))}
                  className="w-full mt-3 accent-[var(--volt)]"
                />
              </label>
              <label className="block text-sm text-[var(--texto-secundario)]">
                Duración sesión (min):{' '}
                <span className="rv-data text-[var(--texto-primario)]">{data.session_duration_min}</span>
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={15}
                  value={data.session_duration_min}
                  onChange={(e) => update('session_duration_min', Number(e.target.value))}
                  className="w-full mt-3 accent-[var(--volt)]"
                />
              </label>
              <div>
                <p className="text-sm text-[var(--texto-secundario)] mb-2">Horario preferido</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'morning', label: 'Mañana' },
                      { id: 'afternoon', label: 'Tarde' },
                      { id: 'evening', label: 'Noche' },
                    ] as const
                  ).map((t) => (
                    <Chip
                      key={t.id}
                      active={data.training_time === t.id}
                      onClick={() => update('training_time', t.id)}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step.id === 'preview' && (
            <div className="space-y-4">
              <ul className="space-y-2 text-sm text-[var(--texto-secundario)]">
                <li className="flex justify-between gap-2">
                  <span>Nivel</span>
                  <strong className="text-[var(--texto-primario)]">{data.level}</strong>
                </li>
                <li className="flex justify-between gap-2">
                  <span>FC max / reposo</span>
                  <strong className="rv-data text-[var(--texto-primario)]">
                    {data.hr_max} / {data.hr_resting}
                  </strong>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Meta</span>
                  <strong className="text-[var(--texto-primario)]">{data.goal_target || '—'}</strong>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Disponibilidad</span>
                  <strong className="text-[var(--texto-primario)]">
                    {data.days_per_week}d · {data.session_duration_min} min
                  </strong>
                </li>
              </ul>
              <ZoneBar zones={zones} />
              {error && (
                <p role="alert" className="text-sm text-[var(--coral)]">
                  {error}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--borde-cristal)]">
            <Button
              variant="ghost"
              leftIcon={<ChevronLeft size={16} />}
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              Atrás
            </Button>
            {step.id !== 'preview' ? (
              <Button
                rightIcon={<ChevronRight size={16} />}
                disabled={!canNext()}
                onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                leftIcon={<Check size={16} />}
                loading={saving}
                onClick={saveAndComplete}
              >
                Activar ficha
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};
