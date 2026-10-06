'use client';

import { motion } from 'framer-motion';
import { Edit3, Trash2 } from 'lucide-react';
import { Athlete } from '@/types/database';
import { PremiumCard } from '@/components/shared/PremiumCard';
import { cn } from '@/lib/utils';

interface AthleteMemberCardProps {
  athlete: Athlete;
  index?: number;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function statusLabel(status: Athlete['status']): string {
  if (status === 'optimal') return 'Óptimo';
  if (status === 'attention') return 'Atención';
  if (status === 'review') return 'Revisar';
  if (status === 'no_data') return 'Sin datos';
  return String(status);
}

function statusTone(status: Athlete['status']) {
  if (status === 'optimal') return 'text-[var(--exito)]';
  if (status === 'attention') return 'text-[var(--advertencia)]';
  if (status === 'review') return 'text-[var(--peligro)]';
  return 'text-[var(--texto-terciario)]';
}

function dotClass(status: Athlete['status']) {
  if (status === 'optimal')
    return 'bg-[var(--exito)] shadow-[0_0_10px_rgba(0,230,118,0.45)]';
  if (status === 'attention')
    return 'bg-[var(--advertencia)] shadow-[0_0_10px_rgba(255,171,0,0.45)]';
  if (status === 'review')
    return 'bg-[var(--peligro)] shadow-[0_0_10px_rgba(255,23,68,0.45)]';
  return 'bg-[var(--texto-terciario)]';
}

/** Riesgo operativo a partir de ACWR + ready (lógica RUNOVA, look GymCRM) */
function riskFromAthlete(ath: Athlete): number {
  const acwr = ath.acwr ?? 1;
  const ready = ath.ready_score ?? 70;
  let risk = 20;
  if (acwr > 1.5) risk += 45;
  else if (acwr > 1.3) risk += 30;
  else if (acwr < 0.8) risk += 25;
  if (ready < 50) risk += 35;
  else if (ready < 65) risk += 20;
  if (ath.status === 'review') risk = Math.max(risk, 85);
  if (ath.status === 'attention') risk = Math.max(risk, 55);
  if (ath.status === 'optimal') risk = Math.min(risk, 25);
  return Math.min(100, Math.max(5, Math.round(risk)));
}

function riskBarClass(risk: number) {
  if (risk > 75) return 'bg-[var(--peligro)]';
  if (risk > 40) return 'bg-[var(--advertencia)]';
  return 'bg-[var(--exito)]';
}

/** Réplica visual CardMiembroElite GymCRM — datos de atleta RUNOVA */
export function AthleteMemberCard({
  athlete,
  index = 0,
  onOpen,
  onEdit,
  onDelete,
}: AthleteMemberCardProps) {
  const iniciales =
    athlete.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '?';
  const risk = riskFromAthlete(athlete);
  const accent =
    athlete.status === 'optimal'
      ? 'primario'
      : athlete.status === 'review'
        ? 'secundario'
        : 'terciario';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      <PremiumCard
        className="p-6 h-full flex flex-col relative overflow-hidden"
        innerClassName="h-full flex flex-col flex-1"
        accent={accent}
        hover={false}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primario)]/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-[var(--brand-primario)]/20 transition-colors duration-500" />

        {/* Header: avatar + tier + estado */}
        <div className="flex items-start justify-between mb-6 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-[var(--radio-md)] bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] overflow-hidden flex items-center justify-center group-hover:border-[color-mix(in_srgb,var(--brand-primario)_50%,transparent)] transition-all shadow-[var(--sombra-penumbra)]">
              {athlete.avatar_url ? (
                <img
                  src={athlete.avatar_url}
                  alt=""
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              ) : (
                <span className="text-xl font-black italic text-[var(--brand-primario)] font-display">
                  {iniciales}
                </span>
              )}
            </div>
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-elevado)]',
                dotClass(athlete.status)
              )}
            />
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] text-[9px] font-black uppercase tracking-widest text-[var(--texto-terciario)] mb-2 font-display">
              {athlete.preferred_distance || '—'}
            </span>
            <p
              className={cn(
                'text-[10px] font-black uppercase tracking-widest font-display',
                statusTone(athlete.status)
              )}
            >
              {statusLabel(athlete.status)}
            </p>
          </div>
        </div>

        {/* Nombre centrado */}
        <div className="space-y-1 mb-8 relative z-10 text-center">
          <h3 className="text-lg font-black italic uppercase tracking-tighter text-[var(--texto-primario)] group-hover:text-[var(--brand-primario)] transition-colors truncate font-display">
            {athlete.full_name}
          </h3>
          <p className="text-[10px] font-mono font-bold text-[var(--brand-primario)]/80 truncate tracking-widest mb-1">
            {athlete.level || '—'} · {athlete.preferred_distance || 'Dist'}
          </p>
          <p className="text-[9px] font-bold text-[var(--texto-terciario)] truncate">
            VDOT {athlete.vo2_max ?? '—'}
          </p>
        </div>

        {/* Métricas Ready | ACWR | Plan */}
        <div className="grid grid-cols-3 mb-8 relative z-10 border border-[var(--borde-cristal)] rounded-2xl overflow-hidden bg-[var(--bg-overlay)]/80 backdrop-blur-md">
          <div className="p-3 border-r border-[var(--borde-cristal)] flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--texto-terciario)] mb-1 font-display">
              Ready
            </span>
            <span className="text-sm font-black italic text-[var(--texto-primario)] font-display">
              {athlete.ready_score ?? '—'}
            </span>
          </div>
          <div className="p-3 border-r border-[var(--borde-cristal)] flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--texto-terciario)] mb-1 font-display">
              ACWR
            </span>
            <span className="text-sm font-black italic text-[var(--texto-primario)] font-display">
              {athlete.acwr != null ? athlete.acwr.toFixed(2) : '—'}
            </span>
          </div>
          <div className="p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--texto-terciario)] mb-1 font-display">
              Plan
            </span>
            <span className="text-sm font-black italic text-[var(--texto-primario)] font-display">
              {athlete.compliance_rate != null
                ? `${Math.round(athlete.compliance_rate)}%`
                : '—'}
            </span>
          </div>
        </div>

        {/* Riesgo operativo */}
        <div className="mb-8 relative z-10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--texto-terciario)] font-display">
              Riesgo de carga
            </span>
            <span className="text-[10px] font-black italic text-[var(--texto-primario)] font-display">
              {risk}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-[var(--bg-sutil)] rounded-full overflow-hidden border border-[var(--borde-cristal)]">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${risk}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={cn('h-full rounded-full', riskBarClass(risk))}
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-auto flex items-center gap-2 relative z-10 pt-4 border-t border-[var(--borde-cristal)]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          className="flex-1 py-2.5 rounded-[var(--radio-md)] bg-[var(--bg-overlay)] hover:bg-[var(--brand-primario)] text-[var(--texto-terciario)] hover:text-black text-[10px] font-black uppercase tracking-widest transition-all border border-[var(--borde-cristal)] hover:border-[var(--brand-primario)] hover:shadow-[0_0_20px_rgba(193,244,41,0.3)] font-display"
          >
            Ver ficha
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-10 h-10 flex items-center justify-center rounded-[var(--radio-md)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-sutil)] border border-[var(--borde-cristal)] transition-all text-[var(--texto-terciario)] hover:text-[var(--texto-primario)]"
              aria-label={`Editar ${athlete.full_name}`}
            >
              <Edit3 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-10 h-10 flex items-center justify-center rounded-[var(--radio-md)] bg-[color-mix(in_srgb,var(--peligro)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--peligro)_20%,transparent)] border border-[color-mix(in_srgb,var(--peligro)_20%,transparent)] transition-all text-[var(--peligro)]"
              aria-label={`Eliminar ${athlete.full_name}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </PremiumCard>
    </motion.div>
  );
}
