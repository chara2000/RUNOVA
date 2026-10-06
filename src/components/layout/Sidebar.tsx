'use client';

import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  Dumbbell,
  GitCompare,
  Gauge,
  Cpu,
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  Inbox,
  Trophy,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Watch,
} from 'lucide-react';
import { ActiveRole } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useRunova } from '@/context/RunovaContext';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  currentRole: ActiveRole;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userSession?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
    role?: string;
  } | null;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  badge?: string;
  grupo: string;
}

function BatteryIcon({ level }: { level: number }) {
  if (level < 25) return <BatteryLow size={14} className="text-[var(--peligro)]" />;
  if (level < 60) return <BatteryMedium size={14} className="text-[var(--advertencia)]" />;
  return <BatteryFull size={14} className="text-[var(--exito)]" />;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  currentRole,
  collapsed = false,
  onToggleCollapse,
  userSession,
}) => {
  const { inboxActivities, devices, selectedAthlete, athletes } = useRunova();

  const activeDevice = useMemo(() => {
    const personal = devices.find(
      (d) =>
        !d.is_coach_owned &&
        (d.status === 'connected' || d.status === 'assigned') &&
        typeof d.battery_level === 'number'
    );
    if (personal) return personal;
    const assigned = devices.find(
      (d) =>
        d.status === 'assigned' &&
        d.current_athlete_name &&
        selectedAthlete?.full_name &&
        d.current_athlete_name === selectedAthlete.full_name &&
        typeof d.battery_level === 'number'
    );
    if (assigned) return assigned;
    return devices.find((d) => typeof d.battery_level === 'number') || null;
  }, [devices, selectedAthlete?.full_name]);

  const battery = activeDevice?.battery_level ?? null;

  const athleteItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, grupo: 'Principal' },
    { id: 'plan-vs-real', label: 'Plan vs Real', icon: GitCompare, grupo: 'Principal' },
    { id: 'performance', label: 'Rendimiento', icon: Gauge, grupo: 'Principal' },
    { id: 'live', label: 'LIVE HUD', icon: Radio, grupo: 'Entrenar' },
    { id: 'workouts', label: 'Sesiones', icon: Dumbbell, grupo: 'Entrenar' },
    { id: 'devices', label: 'RUNOVA Connect', icon: Watch, badge: '⌚', grupo: 'Entrenar' },
    { id: 'races', label: 'Race Center', icon: Trophy, badge: '45d', grupo: 'Entrenar' },
    {
      id: 'inbox',
      label: 'Bandeja',
      icon: Inbox,
      badge: inboxActivities.length > 0 ? String(inboxActivities.length) : undefined,
      grupo: 'Datos',
    },
    { id: 'import', label: 'Importar', icon: UploadCloud, grupo: 'Datos' },
    { id: 'ai', label: 'AI Coach', icon: Sparkles, grupo: 'Sistema' },
    { id: 'profile', label: 'Mi ficha', icon: UserSquare2, grupo: 'Sistema' },
    { id: 'reports', label: 'Informes', icon: FileSpreadsheet, grupo: 'Sistema' },
  ];

  const coachItems: NavItem[] = [
    { id: 'dashboard', label: 'Panel Coach', icon: LayoutDashboard, grupo: 'Principal' },
    {
      id: 'athletes',
      label: 'Atletas',
      icon: Users,
      badge: String(athletes.length || 6),
      grupo: 'Principal',
    },
    { id: 'plan-vs-real', label: 'Cumplimiento', icon: GitCompare, grupo: 'Principal' },
    { id: 'workouts', label: 'Prescriptor', icon: Dumbbell, grupo: 'Entrenar' },
    { id: 'live', label: 'Monitor LIVE', icon: Radio, grupo: 'Entrenar' },
    { id: 'devices', label: 'RUNOVA Connect', icon: Watch, badge: '⌚', grupo: 'Entrenar' },
    { id: 'races', label: 'Calendario', icon: Trophy, grupo: 'Entrenar' },
    {
      id: 'inbox',
      label: 'Validación',
      icon: Inbox,
      badge: inboxActivities.length > 0 ? String(inboxActivities.length) : undefined,
      grupo: 'Datos',
    },
    { id: 'reports', label: 'Informes', icon: FileSpreadsheet, grupo: 'Datos' },
    { id: 'ai', label: 'AI Coach', icon: Sparkles, grupo: 'Sistema' },
  ];

  const clubItems: NavItem[] = [
    { id: 'dashboard', label: 'Métricas', icon: LayoutDashboard, grupo: 'Principal' },
    { id: 'athletes', label: 'Padrón', icon: Users, grupo: 'Principal' },
    { id: 'races', label: 'Competiciones', icon: Trophy, grupo: 'Principal' },
    { id: 'devices', label: 'RUNOVA Connect', icon: Watch, badge: '⌚', grupo: 'Ops' },
    { id: 'reports', label: 'Informes', icon: FileSpreadsheet, grupo: 'Ops' },
    { id: 'ai', label: 'AI Club', icon: Sparkles, grupo: 'Ops' },
  ];

  const items =
    currentRole === 'athlete'
      ? athleteItems
      : currentRole === 'coach'
        ? coachItems
        : clubItems;
  const grupos = Array.from(new Set(items.map((i) => i.grupo)));

  const displayName = userSession?.full_name || selectedAthlete?.full_name || 'Usuario';
  const displayEmail = userSession?.email || '';
  const avatar = userSession?.avatar_url || selectedAthlete?.avatar_url || '';

  const roleHint =
    currentRole === 'athlete' ? 'Atleta Pro' : currentRole === 'coach' ? 'Head Coach' : 'Club';

  return (
    <aside
      className={cn(
        'rv-sidebar hidden md:flex flex-col shrink-0 fixed left-0 z-40 overflow-hidden transition-[width] duration-300',
        'top-[var(--navbar-h)] h-[calc(100dvh-var(--navbar-h))]',
        collapsed ? 'w-[76px]' : 'w-[272px]'
      )}
      style={{
        background: 'var(--bg-elevado)',
        borderRight: '1px solid var(--borde-cristal)',
        boxShadow: 'var(--sombra-umbra)',
      }}
    >
      {/* Header fijo — botón contraer menú */}
      <div
        className={cn(
          'relative flex items-center shrink-0 h-14 px-3 border-b border-[var(--borde-cristal)]',
          collapsed ? 'justify-center' : 'justify-between gap-2'
        )}
      >
        {!collapsed && (
          <div className="min-w-0 pl-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--texto-terciario)] font-display">
              Navegación
            </p>
            <p className="text-[11px] font-bold text-[var(--texto-secundario)] font-display uppercase tracking-wider truncate mt-0.5">
              {roleHint}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-10 h-10 rounded-[var(--radio-md)] inline-flex items-center justify-center text-[var(--texto-secundario)] hover:text-[var(--texto-primario)] bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] hover:border-[var(--borde-fuerte)] transition-all shrink-0"
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav con scroll interno */}
      <nav
        className="rv-sidebar-scroll relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain py-3 px-2.5 space-y-5"
        aria-label="Módulos"
      >
        {grupos.map((grupo) => (
          <div key={grupo} className="space-y-1">
            {!collapsed && (
              <p className="text-[9px] font-black uppercase tracking-[0.35em] px-3.5 mb-1 text-[var(--texto-terciario)]/70 font-display">
                {grupo}
              </p>
            )}
            {collapsed && (
              <div className="mx-auto w-6 h-px bg-[var(--borde-cristal)] mb-1" aria-hidden />
            )}
            {items
              .filter((i) => i.grupo === grupo)
              .map((item) => {
                const Icon = item.icon;
                const activo = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={collapsed ? item.label : undefined}
                    onClick={() => onSelectView(item.id)}
                    className={cn(
                      'relative w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] transition-all duration-300 group',
                      collapsed && 'justify-center px-0',
                      activo
                        ? 'text-[var(--texto-primario)]'
                        : 'text-[var(--texto-terciario)] hover:text-[var(--texto-primario)]'
                    )}
                  >
                    {activo && (
                      <span
                        className="absolute inset-0 rounded-[16px] z-0 shadow-[var(--sombra-umbra)] bg-[var(--bg-overlay)]"
                        style={{ border: '1px solid var(--borde-fuerte)' }}
                      />
                    )}
                    {!activo && (
                      <span className="absolute inset-0 rounded-[16px] z-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-overlay)]/80" />
                    )}
                    {activo && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[var(--texto-primario)] rounded-full z-10" />
                    )}
                    <span
                      className={cn(
                        'relative z-10 shrink-0 transition-transform duration-300',
                        activo && 'text-[var(--texto-primario)] scale-110'
                      )}
                    >
                      <Icon size={20} strokeWidth={activo ? 2.5 : 1.6} />
                    </span>
                    {!collapsed && (
                      <>
                        <span className="relative z-10 text-[13px] font-bold tracking-tight font-display uppercase truncate flex-1 text-left">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="relative z-10 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[var(--brand-primario)]/15 text-[var(--brand-primario)] border border-[color-mix(in_srgb,var(--brand-primario)_25%,transparent)]">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </nav>

      {/* Footer fijo */}
      <div className="relative shrink-0 border-t border-[var(--borde-cristal)] p-2.5 space-y-2 bg-[var(--bg-elevado)]">
        {battery != null && (
          <button
            type="button"
            onClick={() => onSelectView('devices')}
            className={cn(
              'w-full rounded-[var(--radio-md)] border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] p-2.5 text-left hover:border-[var(--borde-fuerte)] transition-all',
              collapsed && 'flex justify-center p-2'
            )}
            title={activeDevice?.name || 'Dispositivo'}
          >
            {collapsed ? (
              <BatteryIcon level={battery} />
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[var(--texto-terciario)] font-display flex items-center gap-1.5">
                    <Watch size={12} />
                    En uso
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[var(--texto-primario)]">
                    <BatteryIcon level={battery} />
                    {battery}%
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[var(--texto-secundario)] truncate">
                  {activeDevice?.name || 'Dispositivo'}
                </p>
                <div className="h-1.5 rounded-full bg-[var(--bg-sutil)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${battery}%`,
                      background:
                        battery < 25
                          ? 'var(--peligro)'
                          : battery < 60
                            ? 'var(--advertencia)'
                            : 'var(--brand-primario)',
                    }}
                  />
                </div>
              </div>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => onSelectView('profile')}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-[var(--radio-md)] border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] p-2 hover:border-[var(--borde-fuerte)] transition-all',
            collapsed && 'justify-center'
          )}
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="w-8 h-8 rounded-[var(--radio-sm)] object-cover shrink-0 ring-1 ring-[var(--borde-cristal)]"
            />
          ) : (
            <div className="w-8 h-8 rounded-[var(--radio-sm)] shrink-0 ring-1 ring-[var(--borde-cristal)] bg-[var(--bg-sutil)] flex items-center justify-center text-[10px] font-black uppercase font-display text-[var(--texto-secundario)]">
              {displayName.slice(0, 2)}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[12px] font-bold text-[var(--texto-primario)] truncate font-display uppercase tracking-wide">
                {displayName.split(' ').slice(0, 2).join(' ')}
              </p>
              <p className="text-[10px] text-[var(--texto-terciario)] truncate">{displayEmail}</p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
