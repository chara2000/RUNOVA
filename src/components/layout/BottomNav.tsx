'use client';

import React, { useState } from 'react';
import {
  Home,
  Dumbbell,
  Plus,
  BarChart3,
  User,
  Play,
  Upload,
  Inbox,
  Trophy,
  MoreHorizontal,
  X,
  GitCompare,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenLive: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onSelectView,
  onOpenLive,
}) => {
  const [plusOpen, setPlusOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'workouts', label: 'Entrenar', icon: Dumbbell },
    { id: 'performance', label: 'Análisis', icon: BarChart3 },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const moreItems = [
    { id: 'plan-vs-real', label: 'Plan vs Real', icon: GitCompare },
    { id: 'races', label: 'Race Center', icon: Trophy },
    { id: 'inbox', label: 'Bandeja', icon: Inbox },
    { id: 'devices', label: 'Dispositivos', icon: Cpu },
    { id: 'import', label: 'Importar', icon: Upload },
    { id: 'ai', label: 'AI Coach', icon: Sparkles },
    { id: 'reports', label: 'Informes', icon: BarChart3 },
  ];

  return (
    <>
      {(plusOpen || moreOpen) && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end p-4 md:hidden"
          onClick={() => {
            setPlusOpen(false);
            setMoreOpen(false);
          }}
        >
          <div className="rv-backdrop absolute inset-0 backdrop-blur-md" />
          <div
            className="relative rounded-[var(--radio-lg)] p-5 space-y-3 border border-[var(--borde-fuerte)] bg-[var(--bg-elevado)] shadow-[var(--sombra-premium)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--borde-cristal)]">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--texto-primario)] font-display">
                {plusOpen ? 'Acción rápida' : 'Más'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPlusOpen(false);
                  setMoreOpen(false);
                }}
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] text-[var(--texto-secundario)]"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {plusOpen && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPlusOpen(false);
                    onOpenLive();
                  }}
                  className="flex flex-col items-center justify-center min-h-[88px] p-4 rounded-2xl bg-[color-mix(in_srgb,var(--brand-primario)_12%,transparent)] border border-[color-mix(in_srgb,var(--brand-primario)_35%,transparent)]"
                >
                  <Play className="w-5 h-5 text-[var(--volt)] mb-2" />
                  <span className="text-xs font-bold">Iniciar LIVE</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlusOpen(false);
                    onSelectView('import');
                  }}
                  className="flex flex-col items-center justify-center min-h-[88px] p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)]"
                >
                  <Upload className="w-5 h-5 text-[var(--cyan)] mb-2" />
                  <span className="text-xs font-bold">Importar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlusOpen(false);
                    onSelectView('inbox');
                  }}
                  className="flex flex-col items-center justify-center min-h-[88px] p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)]"
                >
                  <Inbox className="w-5 h-5 text-[var(--cyan)] mb-2" />
                  <span className="text-xs font-bold">Bandeja</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlusOpen(false);
                    onSelectView('races');
                  }}
                  className="flex flex-col items-center justify-center min-h-[88px] p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)]"
                >
                  <Trophy className="w-5 h-5 text-[var(--volt)] mb-2" />
                  <span className="text-xs font-bold">Race Center</span>
                </button>
              </div>
            )}

            {moreOpen && (
              <div className="grid grid-cols-1 gap-1">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onSelectView(item.id);
                      }}
                      className="flex items-center gap-3 px-3 min-h-12 rounded-2xl text-sm text-[var(--texto-primario)] hover:bg-[var(--bg-overlay)]"
                    >
                      <Icon size={18} className="text-[var(--texto-secundario)]" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--borde-cristal)] px-2 py-1.5 flex items-center justify-around bg-[var(--bg-elevado)]/95 backdrop-blur-xl safe-area-bottom shadow-[var(--sombra-penumbra)]">
        {primary.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-11 min-w-11 px-2 transition-colors',
                active ? 'text-[var(--brand-primario)]' : 'text-[var(--texto-terciario)]'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider font-display">
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setMoreOpen(false);
            setPlusOpen(true);
          }}
          aria-label="Acciones rápidas"
          className="relative -top-2 w-14 h-14 rounded-[20px] bg-[var(--brand-primario)] text-black flex items-center justify-center shadow-[0_8px_24px_rgba(193,244,41,0.35)]"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>

        {primary.slice(2).map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-11 min-w-11 px-2 transition-colors',
                active ? 'text-[var(--brand-primario)]' : 'text-[var(--texto-terciario)]'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider font-display">
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setPlusOpen(false);
            setMoreOpen(true);
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-h-11 min-w-11 px-2 transition-colors',
            moreItems.some((i) => i.id === activeView)
              ? 'text-[var(--brand-primario)]'
              : 'text-[var(--texto-terciario)]'
          )}
        >
          <MoreHorizontal size={20} />
          <span className="text-[9px] font-black uppercase tracking-wider font-display">Más</span>
        </button>
      </nav>
    </>
  );
};
