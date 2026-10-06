'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RunovaLogo } from '../brand/RunovaLogo';
import { useAuth } from '@/lib/hooks/useAuth';
import { UserRole } from '@/types/database';
import { Button, Chip } from '@/components/ui';

interface SecureLoginViewProps {
  onLoginSuccess: () => void;
  onCancel?: () => void;
}

export const SecureLoginView: React.FC<SecureLoginViewProps> = ({
  onLoginSuccess,
  onCancel,
}) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('ATHLETE');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        onLoginSuccess();
      } else {
        await signUp(email.trim(), password, fullName.trim(), role);
        setSuccessMsg('Cuenta creada. Revisa tu correo si pide confirmación, o inicia sesión.');
        setMode('login');
        setPassword('');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de autenticación.';
      if (message.includes('Invalid login credentials')) {
        setErrorMsg('Credenciales inválidas.');
      } else if (message.includes('User already registered')) {
        setErrorMsg('Este correo ya está registrado. Inicia sesión.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh flex overflow-hidden bg-[var(--bg-base)]">
      {/* Panel marca — desktop */}
      <aside className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-10 xl:p-14 border-r border-[var(--borde-cristal)] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 30% 20%, color-mix(in srgb, var(--brand-primario) 18%, transparent), transparent 55%),
              linear-gradient(165deg, var(--bg-elevado) 0%, var(--bg-base) 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(var(--borde-cristal) 1px, transparent 1px), linear-gradient(90deg, var(--borde-cristal) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10">
          <RunovaLogo size="lg" showText showSubtitle={false} />
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--brand-primario)] font-display">
            Acceso seguro
          </p>
          <h1 className="text-5xl xl:text-6xl font-display font-black italic uppercase tracking-tighter leading-[0.88] text-[var(--texto-primario)]">
            Entra al
            <span className="block text-[var(--brand-primario)]">ciclo</span>
          </h1>
          <p className="text-sm text-[var(--texto-secundario)] leading-relaxed">
            Misma identidad visual que el producto: plan, telemetría y equipo en
            una sola sesión autenticada.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Plan', value: 'vs Real' },
              { label: 'LIVE', value: 'HUD' },
              { label: 'Club', value: 'Roster' },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-[var(--radio-md)] border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] px-3 py-3"
              >
                <p className="text-[9px] font-black uppercase tracking-wider text-[var(--texto-terciario)] font-display">
                  {m.label}
                </p>
                <p className="text-sm font-display font-bold text-[var(--texto-primario)] mt-0.5">
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px] font-mono text-[var(--texto-terciario)]">
          RUNOVA · Auth GoTrue / Supabase
        </p>
      </aside>

      {/* Formulario */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-8 h-16 border-b border-[var(--borde-cristal)] lg:border-0">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 text-sm text-[var(--texto-secundario)] hover:text-[var(--texto-primario)] transition-colors"
            >
              <ArrowLeft size={16} />
              Atrás
            </button>
          ) : (
            <span />
          )}
          <div className="lg:hidden">
            <RunovaLogo size="sm" showText showSubtitle={false} />
          </div>
          <span className="text-[10px] font-mono text-[var(--texto-terciario)] uppercase tracking-wider">
            Acceso
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)]">
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </h2>
              <p className="mt-2 text-sm text-[var(--texto-secundario)]">
                Accede a tu plataforma de alto rendimiento
              </p>
            </div>

            <div className="flex gap-2 mb-6 p-1 rounded-[var(--radio-md)] border border-[var(--borde-cristal)] bg-[var(--bg-overlay)]">
              <Chip
                active={mode === 'login'}
                onClick={() => setMode('login')}
                className="flex-1 justify-center !rounded-[var(--radio-sm)]"
              >
                Entrar
              </Chip>
              <Chip
                active={mode === 'register'}
                onClick={() => setMode('register')}
                className="flex-1 justify-center !rounded-[var(--radio-sm)]"
              >
                Crear cuenta
              </Chip>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-[var(--radio-lg)] border border-[var(--borde-cristal)] bg-[var(--bg-elevado)] p-5 sm:p-6 shadow-[var(--sombra-penumbra)]"
            >
              {mode === 'register' && (
                <label className="block text-sm text-[var(--texto-secundario)]">
                  Nombre completo
                  <div className="relative mt-1.5">
                    <User
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--texto-terciario)]"
                    />
                    <input
                      className="input-zenith pl-10"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </label>
              )}

              <label className="block text-sm text-[var(--texto-secundario)]">
                Correo
                <div className="relative mt-1.5">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--texto-terciario)]"
                  />
                  <input
                    type="email"
                    className="input-zenith pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block text-sm text-[var(--texto-secundario)]">
                Contraseña
                <div className="relative mt-1.5">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--texto-terciario)]"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-zenith pl-10 pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center text-[var(--texto-terciario)]"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {mode === 'register' && (
                <div>
                  <p className="text-sm text-[var(--texto-secundario)] mb-2">Rol</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'ATHLETE' as const, label: 'Atleta' },
                        { id: 'COACH' as const, label: 'Coach' },
                        { id: 'ADMIN' as const, label: 'Club' },
                      ]
                    ).map((r) => (
                      <Chip key={r.id} active={role === r.id} onClick={() => setRole(r.id)}>
                        {r.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-[var(--radio-md)] border border-[color-mix(in_srgb,var(--coral)_35%,transparent)] bg-[color-mix(in_srgb,var(--coral)_10%,transparent)] text-sm text-[var(--coral)]"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  className="flex items-start gap-2 p-3 rounded-[var(--radio-md)] border border-[color-mix(in_srgb,var(--exito)_35%,transparent)] bg-[color-mix(in_srgb,var(--exito)_10%,transparent)] text-sm text-[var(--exito)]"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {mode === 'login' ? 'Entrar a RUNOVA' : 'Crear cuenta'}
              </Button>
            </form>

            <p className="mt-6 text-center text-[11px] text-[var(--texto-terciario)] font-mono">
              Acceso seguro con Supabase Auth
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
