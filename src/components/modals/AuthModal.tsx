'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, ArrowRight } from 'lucide-react';
import { RunovaLogo } from '../brand/RunovaLogo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: 'athlete' | 'coach' | 'club') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'athlete' | 'coach' | 'club'>('athlete');
  const [email, setEmail] = useState('juan.riascos@runova.com');
  const [password, setPassword] = useState('••••••••••');
  const [fullName, setFullName] = useState('Juan David Riascos');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSupabaseConfigured) {
      try {
        if (mode === 'login') {
          await supabase.auth.signInWithPassword({ email, password });
        } else {
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, role: selectedRole.toUpperCase() },
            },
          });
        }
      } catch (err) {
        console.log('Supabase auth feedback:', err);
      }
    }

    setTimeout(() => {
      setLoading(false);
      onSuccess(selectedRole);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="rv-backdrop absolute inset-0 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[var(--radio-lg)] border border-[var(--borde-fuerte)] bg-[var(--bg-elevado)] p-6 sm:p-8 shadow-[var(--sombra-premium)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[var(--brand-primario)]/10 to-transparent pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] text-[var(--texto-terciario)] hover:text-[var(--texto-primario)]"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="relative text-center pt-2 mb-6">
          <RunovaLogo size="md" showSubtitle className="justify-center" />
          <h2 className="text-2xl font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)] mt-5">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <p className="text-xs text-[var(--texto-secundario)] mt-1.5 font-medium">
            Plataforma de alto rendimiento para corredores y coaches
          </p>
        </div>

        <div className="mb-5">
          <p className="rv-caption mb-2">Rol deportivo</p>
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] rounded-2xl">
            {(
              [
                { id: 'athlete' as const, label: 'Corredor', email: 'juan.riascos@runova.com', tone: 'var(--brand-primario)' },
                { id: 'coach' as const, label: 'Coach', email: 'carlos.mendoza@runova.com', tone: 'var(--brand-terciario)' },
                { id: 'club' as const, label: 'Club', email: 'admin@puertotejadarunners.com', tone: 'var(--brand-cuaternario)' },
              ] as const
            ).map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  setSelectedRole(role.id);
                  setEmail(role.email);
                }}
                className={cn(
                  'py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider font-display transition-all',
                  selectedRole === role.id
                    ? 'text-black shadow-sm'
                    : 'text-[var(--texto-terciario)] hover:text-[var(--texto-primario)]'
                )}
                style={
                  selectedRole === role.id
                    ? { background: role.tone }
                    : undefined
                }
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <label className="block">
              <span className="rv-caption mb-1.5 block">Nombre completo</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-zenith"
              />
            </label>
          )}

          <label className="block">
            <span className="rv-caption mb-1.5 block">Correo</span>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--texto-terciario)]"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-zenith pl-10"
              />
            </div>
          </label>

          <label className="block">
            <span className="rv-caption mb-1.5 block">Contraseña</span>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--texto-terciario)]"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-zenith pl-10"
              />
            </div>
          </label>

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            rightIcon={<ArrowRight size={16} />}
          >
            {loading
              ? 'Accediendo…'
              : mode === 'login'
                ? 'Entrar'
                : 'Registrarse'}
          </Button>
        </form>

        <div className="pt-5 mt-2 text-center text-xs text-[var(--texto-secundario)] border-t border-[var(--borde-cristal)]">
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="font-bold text-[var(--texto-primario)] hover:text-[var(--brand-primario)]"
          >
            {mode === 'login' ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
};
