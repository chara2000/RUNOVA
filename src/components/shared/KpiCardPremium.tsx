'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardPremiumProps {
  label?: string;
  titulo?: string;
  title?: string;
  value?: string | number;
  valor?: string | number;
  unit?: string;
  unidad?: string;
  trend?: string;
  tendencia?: { valor?: number | string; esPositiva?: boolean; etiqueta?: string } | string;
  trendPositive?: boolean;
  subtext?: string;
  subtitulo?: string;
  icon?: LucideIcon;
  icono?: LucideIcon;
  color?: 'lime' | 'cyan' | 'purple' | 'coral' | 'rose';
  colorAcento?: string;
  sparkline?: number[];
  datosSparkline?: number[];
  delay?: number;
  onClick?: () => void;
  className?: string;
}

const COLORS = {
  lime: {
    bg: 'rgba(193, 244, 41, 0.1)',
    border: 'rgba(193, 244, 41, 0.2)',
    text: '#C1F429',
    bar: 'bg-[#C1F429]',
  },
  cyan: {
    bg: 'rgba(24, 255, 200, 0.1)',
    border: 'rgba(24, 255, 200, 0.2)',
    text: '#18FFC8',
    bar: 'bg-[#18FFC8]',
  },
  purple: {
    bg: 'rgba(123, 97, 255, 0.1)',
    border: 'rgba(123, 97, 255, 0.2)',
    text: '#7B61FF',
    bar: 'bg-[#7B61FF]',
  },
  coral: {
    bg: 'rgba(255, 109, 109, 0.1)',
    border: 'rgba(255, 109, 109, 0.2)',
    text: '#FF6D6D',
    bar: 'bg-[#FF6D6D]',
  },
  rose: {
    bg: 'rgba(255, 109, 109, 0.1)',
    border: 'rgba(255, 109, 109, 0.2)',
    text: '#FF6D6D',
    bar: 'bg-[#FF6D6D]',
  },
};

/** Réplica KpiCardPremium GymCRM Pro */
export function KpiCardPremium(props: KpiCardPremiumProps) {
  const label = props.label || props.titulo || props.title || '';
  const value =
    props.value !== undefined
      ? props.value
      : props.valor !== undefined
        ? props.valor
        : '';
  const unit = props.unit || props.unidad;
  const subtext = props.subtext || props.subtitulo;
  const Icon = props.icon || props.icono || TrendingUp;
  const sparkline = props.sparkline || props.datosSparkline || [30, 45, 35, 60, 55, 70, 65];
  const delay = props.delay || 0;

  let color: keyof typeof COLORS = props.color === 'rose' ? 'rose' : props.color || 'lime';
  if (props.colorAcento) {
    if (props.colorAcento.includes('18FFC8') || props.colorAcento.includes('cyan') || props.colorAcento.includes('00F0FF'))
      color = 'cyan';
    else if (props.colorAcento.includes('FF6D6D') || props.colorAcento.includes('coral') || props.colorAcento.includes('FF4D26'))
      color = 'coral';
    else if (props.colorAcento.includes('7B61FF') || props.colorAcento.includes('purple') || props.colorAcento.includes('A855F7'))
      color = 'purple';
    else color = 'lime';
  }

  let trend = props.trend;
  let trendPositive = props.trendPositive !== undefined ? props.trendPositive : true;
  if (props.tendencia) {
    if (typeof props.tendencia === 'string') {
      trend = props.tendencia;
    } else {
      trend = `${props.tendencia.esPositiva ? '+' : ''}${props.tendencia.valor}${
        props.tendencia.etiqueta ? ' ' + props.tendencia.etiqueta : ''
      }`;
      trendPositive = !!props.tendencia.esPositiva;
    }
  }

  const c = COLORS[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={props.onClick}
      className={cn(
        'relative p-5 rounded-[var(--radio-lg)] bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--borde-cristal)] hover:border-[var(--borde-fuerte)] transition-all group overflow-hidden shadow-[var(--sombra-penumbra)]',
        props.onClick && 'cursor-pointer',
        props.className
      )}
    >
      <div
        className="absolute -right-10 -top-10 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none"
        style={{ background: c.text }}
      />

      <div className="flex justify-between items-start mb-6">
        <div
          className="p-3 rounded-2xl"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <Icon size={22} style={{ color: c.text }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-overlay)] border border-[var(--borde-default)]">
            {trendPositive ? (
              <TrendingUp size={12} className="text-[var(--exito)]" />
            ) : (
              <TrendingDown size={12} className="text-[var(--peligro)]" />
            )}
            <span
              className={cn(
                'text-[10px] font-black',
                trendPositive ? 'text-[var(--exito)]' : 'text-[var(--peligro)]'
              )}
            >
              {trend}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--texto-terciario)] font-display">
          {label}
        </h3>
        <div className="flex items-baseline gap-1.5">
          <p className="text-4xl font-black italic tracking-tighter text-[var(--texto-primario)] uppercase leading-none font-display">
            {value}
          </p>
          {unit && (
            <span className="text-xs font-mono font-bold text-[var(--texto-terciario)]">
              {unit}
            </span>
          )}
        </div>
        {subtext && (
          <p className="text-[11px] text-[var(--texto-secundario)] pt-0.5">{subtext}</p>
        )}
      </div>

      <div className="h-12 w-full mt-6 flex items-end gap-1 px-1">
        {sparkline.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(8, h)}%` }}
            transition={{ delay: delay + 0.3 + i * 0.05, duration: 0.5 }}
            className={cn('flex-1 rounded-t-sm', c.bar)}
            style={{ opacity: 0.15 + (h / 100) * 0.45 }}
          />
        ))}
      </div>

      <div
        className="absolute bottom-0 left-6 right-6 h-px opacity-25"
        style={{
          background: `linear-gradient(90deg, transparent, ${c.text}, transparent)`,
        }}
      />
    </motion.div>
  );
}
