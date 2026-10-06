'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DbAthlete, DbWeeklySummary, OperationalStatus } from '@/types/database';

export interface AthleteWithSummary extends DbAthlete {
  weeklySummary?: DbWeeklySummary;
  // Joined profile fields
  email?: string;
}

interface UseAthletesReturn {
  athletes: DbAthlete[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  getAthlete: (id: string) => Promise<DbAthlete | null>;
  updateAthlete: (id: string, updates: Partial<DbAthlete>) => Promise<void>;
  deleteAthlete: (id: string) => Promise<void>;
}

interface UseAthletesOptions {
  coachId?: string;
  clubId?: string;
  statusFilter?: OperationalStatus | 'all';
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useAthletes(options: UseAthletesOptions = {}): UseAthletesReturn {
  const {
    coachId,
    clubId,
    statusFilter = 'all',
    searchTerm = '',
    page = 1,
    pageSize = 20,
    enabled = true,
  } = options;

  const [athletes, setAthletes] = useState<DbAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('athletes')
        .select('*, profiles!athletes_user_id_fkey(email, avatar_url)', { count: 'exact' })
        .is('soft_deleted_at', null)
        .order('full_name', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (coachId) query = query.eq('coach_id', coachId);
      if (clubId) query = query.eq('club_id', clubId);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (searchTerm.trim()) {
        query = query.ilike('full_name', `%${searchTerm.trim()}%`);
      }

      const { data, error: dbError, count } = await query;

      if (dbError) throw new Error(dbError.message);
      setAthletes(data ?? []);
      setTotal(count ?? 0);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al cargar atletas';
      setError(message);
      console.error('[useAthletes]', message);
    } finally {
      setLoading(false);
    }
  }, [enabled, coachId, clubId, statusFilter, searchTerm, page, pageSize]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const getAthlete = useCallback(async (id: string): Promise<DbAthlete | null> => {
    const { data, error: dbError } = await supabase
      .from('athletes')
      .select('*, profiles!athletes_user_id_fkey(*)')
      .eq('id', id)
      .single();

    if (dbError) {
      console.error('[useAthletes.getAthlete]', dbError.message);
      return null;
    }
    return data;
  }, []);

  const updateAthlete = useCallback(async (id: string, updates: Partial<DbAthlete>) => {
    const { error: dbError } = await supabase
      .from('athletes')
      .update(updates)
      .eq('id', id);

    if (dbError) throw new Error(dbError.message);

    setAthletes(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteAthlete = useCallback(async (id: string) => {
    // Soft delete
    const { error: dbError } = await supabase
      .from('athletes')
      .update({ soft_deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (dbError) throw new Error(dbError.message);

    setAthletes(prev => prev.filter(a => a.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  return { athletes, loading, error, total, refetch: fetch, getAthlete, updateAthlete, deleteAthlete };
}

// ─── Single athlete hook ─────────────────────────────────────────────────────
interface UseAthleteReturn {
  athlete: DbAthlete | null;
  loading: boolean;
  error: string | null;
  update: (updates: Partial<DbAthlete>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAthlete(athleteId: string | null): UseAthleteReturn {
  const [athlete, setAthlete] = useState<DbAthlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from('athletes')
      .select('*, profiles!athletes_user_id_fkey(*)')
      .eq('id', athleteId)
      .single();

    if (dbError) {
      setError(dbError.message);
    } else {
      setAthlete(data);
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = useCallback(async (updates: Partial<DbAthlete>) => {
    if (!athleteId) return;
    const { error: dbError } = await supabase
      .from('athletes')
      .update(updates)
      .eq('id', athleteId);
    if (dbError) throw new Error(dbError.message);
    setAthlete(prev => prev ? { ...prev, ...updates } : null);
  }, [athleteId]);

  return { athlete, loading, error, update, refetch: fetch };
}

// ─── Current user's athlete profile ─────────────────────────────────────────
export function useMyAthlete() {
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoadingId(false); return; }

      supabase
        .from('athletes')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setAthleteId(data?.id ?? null);
          setLoadingId(false);
        });
    });
  }, []);

  const athleteData = useAthlete(athleteId);

  return {
    ...athleteData,
    loading: loadingId || athleteData.loading,
  };
}
