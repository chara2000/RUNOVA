'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, Bot, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import type { Activity, Athlete, Workout } from '@/types/database';
import type { RunovaReadinessState } from '@/types/database';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Chip,
  Metric,
} from '@/components/ui';

interface RunovaAiProps {
  onSelectView: (view: string) => void;
  onOpenLive?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  card?: { title: string; m1: string; m2: string; m3: string };
  alert?: 'warning' | 'info' | 'success';
}

/* ─── helpers ─────────────────────────────────────────────────── */
function secToHM(sec: number): string {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function paceLabel(pace: string | null | undefined): string {
  return pace && pace !== '—' ? pace : '—';
}

function acwrStatus(acwr: number): string {
  if (acwr < 0.8) return 'carga insuficiente (< 0.8)';
  if (acwr <= 1.3) return 'zona óptima (0.8–1.3)';
  if (acwr <= 1.5) return 'carga elevada — supervisar';
  return 'sobrecarga crítica (> 1.5)';
}

/* ─── AI engine ───────────────────────────────────────────────── */
interface AiCtx {
  athlete: Athlete;
  last: Activity | undefined;
  week7: Activity[];
  vol7: number;
  dur7: number;
  avgHr7: number;
  vol30: number;
  atRisk: Athlete[];
  readiness: RunovaReadinessState;
  todayWorkout: Workout;
  totalActivities: number;
}

function buildCtx(
  athlete: Athlete,
  activities: Activity[],
  athletes: Athlete[],
  readiness: RunovaReadinessState,
  todayWorkout: Workout,
): AiCtx {
  const mine = activities.filter((a) => a.athlete_id === athlete.id);
  const last = mine[0];
  const now = Date.now();
  const week7 = mine.filter((a) => now - new Date(a.start_time).getTime() < 7 * 86_400_000);
  const week30 = mine.filter((a) => now - new Date(a.start_time).getTime() < 30 * 86_400_000);
  const vol7 = Number(week7.reduce((s, a) => s + a.distance_km, 0).toFixed(1));
  const dur7 = week7.reduce((s, a) => s + (a.duration_sec || 0), 0);
  const avgHr7 = week7.length
    ? Math.round(week7.reduce((s, a) => s + (a.avg_heart_rate || 0), 0) / week7.length)
    : 0;
  const vol30 = Number(week30.reduce((s, a) => s + a.distance_km, 0).toFixed(1));
  const atRisk = athletes.filter((a) => a.acwr > 1.3 || a.compliance_rate < 60);
  return { athlete, last, week7, vol7, dur7, avgHr7, vol30, atRisk, readiness, todayWorkout, totalActivities: mine.length };
}

function aiReply(prompt: string, ctx: AiCtx): Pick<Message, 'text' | 'card' | 'alert'> {
  const lc = prompt.toLowerCase();
  const { athlete, last, week7, vol7, dur7, avgHr7, vol30, atRisk, readiness, todayWorkout } = ctx;

  if (lc.includes('semana') || lc.includes('resume') || lc.includes('fatiga')) {
    const acwr = athlete.acwr ? athlete.acwr.toFixed(2) : '—';
    const hrv = (athlete as { hrv_baseline_ms?: number }).hrv_baseline_ms
      ? `HRV ${(athlete as { hrv_baseline_ms?: number }).hrv_baseline_ms} ms`
      : `Ready ${athlete.ready_score || '—'}`;
    return {
      text: `Esta semana: **${vol7} km** en ${week7.length} sesión(es), ${secToHM(dur7)} total. FC media ${avgHr7 || '—'} bpm. ACWR ${acwr} — ${acwrStatus(athlete.acwr || 0)}. ${hrv}.`,
      card: { title: 'Resumen semanal', m1: `${vol7} km`, m2: `ACWR ${acwr}`, m3: hrv },
      alert: (athlete.acwr || 0) > 1.3 ? 'warning' : 'success',
    };
  }

  if (lc.includes('mes') || lc.includes('evolucion') || lc.includes('carga') || lc.includes('30')) {
    const compliance = athlete.compliance_rate ? `${Math.round(athlete.compliance_rate)}%` : '—';
    return {
      text: `Últimos 30 días: **${vol30} km** acumulados. Umbral ${paceLabel(athlete.threshold_pace)}/km. VO₂ ${athlete.vo2_max || '—'}. Cumplimiento: ${compliance}. CTL ${Math.round(athlete.chronic_load || 0)}, ATL ${Math.round(athlete.acute_load || 0)}.`,
      card: { title: 'Evolución 30d', m1: `VO₂ ${athlete.vo2_max || '—'}`, m2: paceLabel(athlete.threshold_pace), m3: `${compliance} plan` },
      alert: 'info',
    };
  }

  if (lc.includes('atleta') || lc.includes('club') || lc.includes('sobrecarga') || lc.includes('cumplimiento')) {
    if (atRisk.length === 0) {
      return { text: 'Todos los atletas están en zona verde. Sin alertas de sobrecarga ni bajo cumplimiento.', card: { title: 'Estado club', m1: '✓ Sin alertas', m2: 'ACWR OK', m3: 'Cumpl. OK' }, alert: 'success' };
    }
    const names = atRisk.slice(0, 2).map((a) => `${a.full_name.split(' ')[0]} (ACWR ${a.acwr?.toFixed(2) || '—'})`).join(', ');
    return {
      text: `**${atRisk.length} atleta(s)** requieren atención: ${names}. El resto en zona verde.`,
      card: { title: 'Alertas carga', m1: `${atRisk.length} alertas`, m2: atRisk[0]?.full_name.split(' ')[0] || '—', m3: `ACWR ${atRisk[0]?.acwr?.toFixed(2) || '—'}` },
      alert: 'warning',
    };
  }

  if (lc.includes('último') || lc.includes('ultima') || lc.includes('sesion') || lc.includes('entrenamiento')) {
    if (!last) return { text: 'No hay actividades registradas. Importa un FIT/GPX o completa tu primera sesión.', alert: 'info' };
    return {
      text: `Última sesión "${last.title}": **${last.distance_km} km** a ${paceLabel(last.avg_pace)}/km. Cadencia ${last.avg_cadence || '—'} spm, FC media ${last.avg_heart_rate || '—'} bpm. Duración ${secToHM(last.duration_sec || 0)}.`,
      card: { title: 'Última sesión', m1: paceLabel(last.avg_pace), m2: `${last.avg_cadence || '—'} spm`, m3: `${last.avg_heart_rate || '—'} bpm` },
      alert: 'info',
    };
  }

  if (lc.includes('readiness') || lc.includes('recuper') || lc.includes('listo')) {
    const score = readiness.score ?? 0;
    return {
      text: `Readiness Score: **${score}/100** — ${readiness.category_label}. ACWR ${athlete.acwr?.toFixed(2) || '—'} (${acwrStatus(athlete.acwr || 0)}). ${score >= 70 ? 'Puedes ejecutar el plan con normalidad.' : 'Considera recuperación activa o descanso.'}`,
      card: { title: 'Readiness', m1: `${score}/100`, m2: `ACWR ${athlete.acwr?.toFixed(2) || '—'}`, m3: readiness.category_label.split(' ').slice(0, 2).join(' ') },
      alert: score >= 70 ? 'success' : 'warning',
    };
  }

  if (lc.includes('hoy') || lc.includes('plan') || lc.includes('objetivo')) {
    if (!todayWorkout.id) return { text: 'Sin sesión planificada para hoy. Crea una en el Workout Builder.', alert: 'info' };
    return {
      text: `Sesión de hoy: **"${todayWorkout.title}"** · ${todayWorkout.category} · ${todayWorkout.total_distance_km || '—'} km · Ritmo ${paceLabel(todayWorkout.target_pace)}/km · ${todayWorkout.estimated_duration_min || '—'} min estimados.`,
      card: { title: 'Plan de hoy', m1: `${todayWorkout.total_distance_km || '—'} km`, m2: paceLabel(todayWorkout.target_pace), m3: `${todayWorkout.estimated_duration_min || '—'} min` },
      alert: 'info',
    };
  }

  if (lc.includes('vo2') || lc.includes('fisiolog') || lc.includes('aerobic')) {
    return {
      text: `VO₂ máx: **${athlete.vo2_max || '—'} ml/kg/min**. Umbral ${paceLabel(athlete.threshold_pace)}/km. FC máx ${athlete.hr_max || '—'} bpm, FC reposo ${athlete.hr_resting || '—'} bpm.`,
      card: { title: 'Fisiología', m1: `VO₂ ${athlete.vo2_max || '—'}`, m2: `FC máx ${athlete.hr_max || '—'}`, m3: paceLabel(athlete.threshold_pace) },
      alert: 'info',
    };
  }

  const first = athlete.full_name !== 'Sin atleta' ? athlete.full_name.split(' ')[0] : 'Atleta';
  return {
    text: `${first}, tengo ${ctx.totalActivities} actividad(es) tuyas y tu ficha fisiológica (VO₂ ${athlete.vo2_max || '—'}, umbral ${paceLabel(athlete.threshold_pace)}/km). Puedo analizar semana, carga del mes, atletas en riesgo, última sesión, readiness o plan de hoy. ¿Qué prefieres?`,
    alert: 'info',
  };
}

/* ─── Component ───────────────────────────────────────────────── */
export const RunovaAiView: React.FC<RunovaAiProps> = ({ onSelectView, onOpenLive }) => {
  const { selectedAthlete, aiPrompts, activities, workouts, athletes, readiness, todayWorkout } = useRunova();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: `Hola. Soy RUNOVA Intelligence. Analizo en tiempo real tu ficha fisiológica, historial de actividades y carga. ¿En qué profundizamos?`,
      alert: 'info',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const respond = async (prompt: string) => {
    if (!prompt.trim() || busy) return;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, sender: 'user', text: prompt }]);
    setInput('');
    setBusy(true);

    const ctx = buildCtx(selectedAthlete, activities, athletes, readiness, todayWorkout);

    try {
      // Try real OpenAI API route first
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          athleteContext: {
            full_name: selectedAthlete.full_name,
            vo2_max: selectedAthlete.vo2_max,
            threshold_pace: selectedAthlete.threshold_pace,
            acwr: selectedAthlete.acwr,
            ready_score: selectedAthlete.ready_score,
            compliance_rate: selectedAthlete.compliance_rate,
            chronic_load: selectedAthlete.chronic_load,
            acute_load: selectedAthlete.acute_load,
            hr_max: selectedAthlete.hr_max,
            hr_resting: selectedAthlete.hr_resting,
            level: selectedAthlete.level,
          },
          statsContext: {
            vol7: ctx.vol7,
            vol30: ctx.vol30,
            sessions7: ctx.week7.length,
            avgHr7: ctx.avgHr7,
            lastActivityTitle: ctx.last?.title ?? '',
            lastActivityPace: ctx.last?.avg_pace ?? '',
            lastActivityDist: ctx.last?.distance_km ?? 0,
            atRiskCount: ctx.atRisk.length,
            todayWorkoutTitle: todayWorkout.title,
            todayWorkoutDist: todayWorkout.total_distance_km ?? 0,
            todayWorkoutPace: todayWorkout.target_pace ?? '',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json() as { text?: string; error?: string };
        if (data.text) {
          setMessages((m) => [...m, { id: `a-${Date.now()}`, sender: 'ai', text: data.text!, alert: 'info' as const }]);
          setBusy(false);
          return;
        }
      }
    } catch {
      // fall through to local engine
    }

    // Fallback: local rule-based engine (works without API key)
    const reply = aiReply(prompt, ctx);
    setMessages((m) => [...m, { id: `a-${Date.now()}`, sender: 'ai', ...reply }]);
    setBusy(false);
  };

  const cardStyle = (alert?: Message['alert']) => {
    if (alert === 'warning') return 'border-[color-mix(in_srgb,var(--coral)_30%,transparent)] bg-[color-mix(in_srgb,var(--coral)_6%,var(--surface-1))]';
    if (alert === 'success') return 'border-[color-mix(in_srgb,var(--volt)_30%,transparent)] bg-[color-mix(in_srgb,var(--volt)_6%,var(--surface-1))]';
    return 'border-[color-mix(in_srgb,var(--brand-cuaternario)_30%,transparent)] bg-[color-mix(in_srgb,var(--brand-cuaternario)_8%,transparent)]';
  };

  const icon = (alert?: Message['alert']) => {
    if (alert === 'warning') return <AlertTriangle size={12} className="text-[var(--coral)]" />;
    if (alert === 'success') return <Zap size={12} className="text-[var(--volt)]" />;
    return <TrendingUp size={12} className="text-[var(--purple)]" />;
  };

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title="RUNOVA AI"
        subtitle="Motor de fisiología — datos reales del atleta"
        actions={
          <>
            <Button variant="secondary" onClick={() => onSelectView('performance')}>
              Performance
            </Button>
            {onOpenLive && (
              <Button variant="ghost" onClick={onOpenLive}>
                Live
              </Button>
            )}
          </>
        }
      />

      <Card
        hero
        padding="lg"
        className="border-[color-mix(in_srgb,var(--purple)_40%,transparent)] bg-[color-mix(in_srgb,var(--purple)_6%,var(--surface-1))]"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl border border-[color-mix(in_srgb,var(--brand-cuaternario)_40%,transparent)] bg-[color-mix(in_srgb,var(--brand-cuaternario)_12%,transparent)] flex items-center justify-center">
            <Bot size={22} className="text-[var(--purple)]" />
          </div>
          <div>
            <Badge tone="purple">
              <Sparkles size={12} /> Intelligence · Datos en vivo
            </Badge>
            <h2 className="mt-1 text-2xl font-display font-extrabold text-[var(--texto-primario)]">
              {selectedAthlete.full_name !== 'Sin atleta' ? selectedAthlete.full_name : 'RUNOVA AI'}
            </h2>
            <p className="text-sm text-[var(--texto-secundario)]">
              VO₂ {selectedAthlete.vo2_max || '—'} · Umbral {selectedAthlete.threshold_pace || '—'}/km · ACWR {selectedAthlete.acwr?.toFixed(2) || '—'}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {aiPrompts.map((p) => (
          <Chip key={p} tone="purple" onClick={() => respond(p)}>
            {p}
          </Chip>
        ))}
      </div>

      <Card className="space-y-4 min-h-[360px] flex flex-col" padding="md">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto max-h-[480px] pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.sender === 'user'
                  ? 'ml-8 rounded-[var(--radio-md)] border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] p-3'
                  : `mr-8 rounded-[var(--radio-md)] border p-3 ${cardStyle(msg.alert)}`
              }
            >
              <p className="rv-caption mb-1 uppercase flex items-center gap-1">
                {msg.sender === 'user' ? 'Tú' : <>{icon(msg.alert)} RUNOVA AI</>}
              </p>
              <p className="text-sm text-[var(--texto-primario)] leading-relaxed">
                {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={i}>{part.slice(2, -2)}</strong>
                    : <span key={i}>{part}</span>
                )}
              </p>
              {msg.card && (
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--brand-cuaternario)_25%,transparent)] bg-[var(--bg-elevado)] p-3">
                  <Metric label={msg.card.title} value={msg.card.m1} />
                  <Metric label=" " value={msg.card.m2} />
                  <Metric label=" " value={msg.card.m3} />
                </div>
              )}
            </div>
          ))}
          {busy && (
            <p className="text-xs font-mono text-[var(--purple)] flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-[var(--purple)] border-t-transparent rounded-full animate-spin" />
              Analizando telemetría…
            </p>
          )}
        </div>

        <form
          className="flex gap-2 pt-3 border-t border-[var(--borde-default)]"
          onSubmit={(e) => { e.preventDefault(); respond(input); }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta a RUNOVA AI…"
            className="input-zenith flex-1 focus:border-[var(--brand-cuaternario)]"
          />
          <Button type="submit" loading={busy} leftIcon={<Send size={16} />}>
            Enviar
          </Button>
        </form>
      </Card>
    </div>
  );
};
