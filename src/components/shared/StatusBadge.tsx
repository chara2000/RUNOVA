'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type StatusType =
  | 'optimal'
  | 'activo'
  | 'attention'
  | 'review'
  | 'fatigue'
  | 'connected'
  | 'idle'
  | 'assigned'
  | 'completed'
  | 'completado'
  | 'planned'
  | 'pendiente'
  | 'vencido'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

/** Réplica StatusBadge GymCRM Pro (+ estados RUNOVA) */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  const config: Record<string, { label: string; color: string; glow: boolean }> = {
    activo: {
      label: 'Activo',
      color: 'text-[var(--exito)] border-[var(--exito)]/30 bg-[var(--exito)]/5',
      glow: true,
    },
    optimal: {
      label: 'Óptimo',
      color: 'text-[var(--brand-primario)] border-[var(--brand-primario)]/30 bg-[var(--brand-primario)]/8',
      glow: true,
    },
    completed: {
      label: 'Completado',
      color: 'text-[var(--exito)] border-[var(--exito)]/30 bg-[var(--exito)]/5',
      glow: true,
    },
    completado: {
      label: 'Completado',
      color: 'text-[var(--exito)] border-[var(--exito)]/30 bg-[var(--exito)]/5',
      glow: true,
    },
    connected: {
      label: 'Conectado',
      color: 'text-[var(--brand-terciario)] border-[var(--brand-terciario)]/30 bg-[var(--brand-terciario)]/8',
      glow: true,
    },
    assigned: {
      label: 'Asignado',
      color: 'text-[var(--advertencia)] border-[var(--advertencia)]/30 bg-[var(--advertencia)]/8',
      glow: false,
    },
    attention: {
      label: 'Atención',
      color: 'text-[var(--advertencia)] border-[var(--advertencia)]/30 bg-[var(--advertencia)]/8',
      glow: false,
    },
    review: {
      label: 'Revisar',
      color: 'text-[var(--peligro)] border-[var(--peligro)]/30 bg-[var(--peligro)]/8',
      glow: true,
    },
    fatigue: {
      label: 'Fatiga',
      color: 'text-[var(--peligro)] border-[var(--peligro)]/30 bg-[var(--peligro)]/8',
      glow: true,
    },
    idle: {
      label: 'Disponible',
      color: 'text-[var(--exito)] border-[var(--exito)]/30 bg-[var(--exito)]/5',
      glow: false,
    },
    planned: {
      label: 'Programado',
      color: 'text-[var(--brand-cuaternario)] border-[var(--brand-cuaternario)]/30 bg-[var(--brand-cuaternario)]/8',
      glow: false,
    },
    pendiente: {
      label: 'Pendiente',
      color: 'text-[var(--advertencia)] border-[var(--advertencia)]/30 bg-[var(--advertencia)]/5',
      glow: false,
    },
    vencido: {
      label: 'Vencido',
      color: 'text-[var(--peligro)] border-[var(--peligro)]/30 bg-[var(--peligro)]/5',
      glow: true,
    },
    inactivo: {
      label: 'Inactivo',
      color: 'text-[var(--texto-terciario)] border-[var(--borde-fuerte)] bg-[var(--bg-overlay)]',
      glow: false,
    },
    no_data: {
      label: 'Sin datos',
      color: 'text-[var(--texto-terciario)] border-[var(--borde-fuerte)] bg-[var(--bg-overlay)]',
      glow: false,
    },
  };

  const current = config[normalizedStatus] || {
    label: label || status,
    color: 'text-[var(--texto-terciario)] border-[var(--borde-fuerte)] bg-[var(--bg-overlay)]',
    glow: false,
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest backdrop-blur-md font-display',
        current.color,
        className
      )}
    >
      {current.glow ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
      )}
      {label || current.label}
    </motion.span>
  );
}
