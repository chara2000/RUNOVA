'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Sun,
  Moon,
  LogOut,
  User,
  Bell,
  Lock,
} from 'lucide-react';
import { RunovaLogo } from '../brand/RunovaLogo';
import { useTheme } from '@/context/ThemeContext';
import { zenithToast } from '../common/ZenithToaster';
import { ActiveRole } from '@/lib/navigation';

export type { ActiveRole };

interface NavbarProps {
  currentRole: ActiveRole;
  onOpenLive: () => void;
  onOpenAi: () => void;
  onOpenLogin: () => void;
  onOpenCommand: () => void;
  userSession: any | null;
  onLogout: () => void;
  activeView: string;
  onSelectView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onOpenLogin,
  onOpenCommand,
  userSession,
  onLogout,
  onSelectView,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenCommand();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenCommand]);

  const firstName = userSession?.full_name?.split(' ')[0];
  const roleLabel =
    currentRole === 'athlete' ? 'Atleta' : currentRole === 'coach' ? 'Coach' : 'Club';

  return (
    <header
      className="sticky top-0 z-50 w-full shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      style={{
        height: 'var(--navbar-h)',
        background: 'color-mix(in srgb, var(--bg-elevado) 88%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--borde-cristal)',
      }}
    >
      <button
        type="button"
        onClick={() => onSelectView('dashboard')}
        className="shrink-0 flex items-center"
        title="Inicio"
        aria-label="RUNOVA Pro — Inicio"
      >
        <RunovaLogo size="md" showText showSubtitle={false} />
      </button>

      <button
        type="button"
        onClick={onOpenCommand}
        className="hidden md:flex items-center gap-3 h-10 px-3.5 rounded-[var(--radio-md)] w-full max-w-sm text-left transition-all"
        style={{
          background: 'var(--bg-overlay)',
          border: '1px solid var(--borde-cristal)',
        }}
        aria-label="Abrir búsqueda"
      >
        <Search size={14} className="text-[var(--texto-terciario)] shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--texto-terciario)] flex-1 truncate font-display">
          Buscar módulo…
        </span>
        <kbd className="text-[9px] px-1.5 py-0.5 rounded-[var(--radio-sm)] font-mono font-bold text-[var(--texto-terciario)] border border-[var(--borde-default)]">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center h-10 px-3 rounded-[var(--radio-md)] text-[10px] font-black uppercase tracking-widest font-display text-[var(--texto-primario)]"
          style={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--borde-cristal)',
          }}
        >
          {roleLabel}
        </div>

        <button
          type="button"
          onClick={() => {
            toggleTheme();
            zenithToast.info('Tema', theme === 'dark' ? 'Modo claro activado' : 'Modo oscuro activado');
          }}
          className="w-10 h-10 rounded-[var(--radio-md)] inline-flex items-center justify-center"
          style={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--borde-cristal)',
            color: 'var(--texto-secundario)',
          }}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          type="button"
          className="w-10 h-10 rounded-[var(--radio-md)] inline-flex items-center justify-center"
          style={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--borde-cristal)',
            color: 'var(--texto-secundario)',
          }}
          aria-label="Notificaciones"
          onClick={() => zenithToast.info('Sin notificaciones')}
        >
          <Bell size={16} />
        </button>

        {userSession ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 h-10 pl-1 pr-2.5 rounded-[var(--radio-md)]"
              style={{
                background: 'var(--bg-overlay)',
                border: '1px solid var(--borde-cristal)',
              }}
            >
              <img
                src={
                  userSession.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                }
                alt=""
                className="w-7 h-7 rounded-[var(--radio-sm)] object-cover"
              />
              <span className="text-[11px] font-black uppercase tracking-wider font-display text-[var(--texto-primario)] hidden sm:inline max-w-[90px] truncate">
                {firstName || 'Atleta'}
              </span>
            </button>
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-[var(--radio-md)] p-1.5 z-50"
                style={{
                  background: 'var(--bg-elevado)',
                  border: '1px solid var(--borde-fuerte)',
                  boxShadow: 'var(--sombra-premium)',
                }}
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectView('profile');
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 h-10 rounded-[var(--radio-sm)] text-[11px] font-bold uppercase tracking-wider font-display text-[var(--texto-secundario)] hover:bg-[var(--bg-overlay)]"
                >
                  <User size={14} /> Mi ficha
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 h-10 rounded-[var(--radio-sm)] text-[11px] font-bold uppercase tracking-wider font-display text-[var(--peligro)] hover:bg-[rgba(255,23,68,0.08)]"
                >
                  <LogOut size={14} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={onOpenLogin} className="btn-zenith h-10 px-4 text-xs">
            <Lock size={12} /> Acceder
          </button>
        )}
      </div>
    </header>
  );
};
