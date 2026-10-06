'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DbProfile, UserRole } from '@/types/database';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  onboarding_completed: boolean;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<DbProfile>) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildAuthUser = useCallback(async (supabaseUser: User): Promise<AuthUser | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profileError || !profile) {
        // Profile doesn't exist yet (trigger may not have run)
        return {
          id: supabaseUser.id,
          email: supabaseUser.email ?? '',
          full_name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split('@')[0] ?? '',
          role: (supabaseUser.user_metadata?.role as UserRole) ?? 'ATHLETE',
          avatar_url: null,
          onboarding_completed: false,
        };
      }

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        avatar_url: profile.avatar_url,
        onboarding_completed: profile.onboarding_completed ?? false,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const authUser = await buildAuthUser(s.user);
        setUser(authUser);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        if (s?.user) {
          const authUser = await buildAuthUser(s.user);
          setUser(authUser);
        } else {
          setUser(null);
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [buildAuthUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
        }
        if (signInError.message.includes('Email not confirmed')) {
          throw new Error('Debes confirmar tu correo electrónico antes de iniciar sesión.');
        }
        throw new Error(signInError.message);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error de autenticación';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => {
    setError(null);
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      });
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('Este correo ya está registrado. Inicia sesión o recupera tu contraseña.');
        }
        throw new Error(signUpError.message);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al crear la cuenta';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<DbProfile>) => {
    if (!user) throw new Error('No hay sesión activa');
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (updateError) throw new Error(updateError.message);

      // Refresh user data
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser) {
        const refreshed = await buildAuthUser(supabaseUser);
        setUser(refreshed);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al actualizar perfil';
      setError(message);
      throw e;
    }
  }, [user, buildAuthUser]);

  return { user, session, loading, error, signIn, signUp, signOut, updateProfile };
}
