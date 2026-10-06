'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DbActivity, DbWeeklySummary, ActivityFormat } from '@/types/database';

// ─── Activities ──────────────────────────────────────────────────────────────
interface UseActivitiesReturn {
  activities: DbActivity[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  createActivity: (data: Partial<DbActivity>) => Promise<DbActivity>;
  updateActivity: (id: string, updates: Partial<DbActivity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
}

interface UseActivitiesOptions {
  athleteId?: string | null;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const { athleteId, page = 1, pageSize = 20, enabled = true } = options;

  const [activities, setActivities] = useState<DbActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    if (!enabled || !athleteId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError, count } = await supabase
        .from('activities')
        .select('*', { count: 'exact' })
        .eq('athlete_id', athleteId)
        .is('soft_deleted_at', null)
        .order('start_time', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (dbError) throw new Error(dbError.message);
      setActivities(data ?? []);
      setTotal(count ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar actividades';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enabled, athleteId, page, pageSize]);

  useEffect(() => { fetch(); }, [fetch]);

  const createActivity = useCallback(async (data: Partial<DbActivity>): Promise<DbActivity> => {
    const paceText = data.avg_pace ?? '5:00/km';
    // Parse pace string to seconds
    const paceParts = paceText.replace('/km', '').split(':');
    const paceSec = paceParts.length === 2
      ? parseInt(paceParts[0]) * 60 + parseInt(paceParts[1])
      : null;

    const { data: inserted, error: dbError } = await supabase
      .from('activities')
      .insert({
        athlete_id: data.athlete_id!,
        workout_id: data.workout_id ?? null,
        device_id: data.device_id ?? null,
        title: data.title ?? 'Carrera sin título',
        format: data.format ?? 'MANUAL' as ActivityFormat,
        start_time: data.start_time ?? new Date().toISOString(),
        distance_km: data.distance_km ?? 0,
        duration_sec: data.duration_sec ?? 0,
        avg_pace: paceText,
        avg_pace_sec: paceSec,
        max_pace: data.max_pace ?? null,
        avg_speed_kmh: data.avg_speed_kmh ?? null,
        max_speed_kmh: data.max_speed_kmh ?? null,
        elevation_gain_m: data.elevation_gain_m ?? 0,
        elevation_loss_m: data.elevation_loss_m ?? 0,
        calories: data.calories ?? 0,
        avg_heart_rate: data.avg_heart_rate ?? null,
        max_heart_rate: data.max_heart_rate ?? null,
        avg_cadence: data.avg_cadence ?? null,
        is_matched: data.workout_id ? true : false,
        match_confidence: data.match_confidence ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (dbError || !inserted) throw new Error(dbError?.message ?? 'Error al crear actividad');

    setActivities(prev => [inserted, ...prev]);
    setTotal(prev => prev + 1);
    return inserted;
  }, []);

  const updateActivity = useCallback(async (id: string, updates: Partial<DbActivity>) => {
    const { error: dbError } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', id);
    if (dbError) throw new Error(dbError.message);
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    const { error: dbError } = await supabase
      .from('activities')
      .update({ soft_deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (dbError) throw new Error(dbError.message);
    setActivities(prev => prev.filter(a => a.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  return { activities, loading, error, total, refetch: fetch, createActivity, updateActivity, deleteActivity };
}

// ─── Weekly summary ──────────────────────────────────────────────────────────
interface UseWeeklySummaryReturn {
  currentWeek: DbWeeklySummary | null;
  lastWeeks: DbWeeklySummary[];
  loading: boolean;
  error: string | null;
}

export function useWeeklySummary(athleteId: string | null, weeksBack = 8): UseWeeklySummaryReturn {
  const [currentWeek, setCurrentWeek] = useState<DbWeeklySummary | null>(null);
  const [lastWeeks, setLastWeeks] = useState<DbWeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);

      const { data, error: dbError } = await supabase
        .from('weekly_summaries')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('week_start', { ascending: false })
        .limit(weeksBack);

      if (dbError) {
        setError(dbError.message);
      } else {
        const sorted = data ?? [];
        setCurrentWeek(sorted[0] ?? null);
        setLastWeeks(sorted.slice(1));
      }
      setLoading(false);
    };

    fetch();
  }, [athleteId, weeksBack]);

  return { currentWeek, lastWeeks, loading, error };
}

// ─── Activity inbox ──────────────────────────────────────────────────────────
interface DbActivityInbox {
  id: string;
  athlete_id: string;
  raw_source: string;
  device_model: string | null;
  title: string;
  activity_date: string;
  distance_km: number | null;
  duration_sec: number | null;
  avg_pace: string | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_cadence: number | null;
  elevation_gain_m: number | null;
  calories: number | null;
  suggested_workout_id: string | null;
  match_confidence_pct: number | null;
  status: 'pending' | 'analyzed' | 'saved' | 'discarded';
  notes: string | null;
  synced_at: string;
  created_at: string;
}

interface UseInboxReturn {
  inbox: DbActivityInbox[];
  loading: boolean;
  error: string | null;
  saveItem: (item: DbActivityInbox) => Promise<void>;
  discardItem: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useActivityInbox(athleteId: string | null): UseInboxReturn {
  const [inbox, setInbox] = useState<DbActivityInbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);

    const { data, error: dbError } = await supabase
      .from('activity_inbox')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('status', 'pending')
      .order('synced_at', { ascending: false });

    if (dbError) setError(dbError.message);
    else setInbox(data ?? []);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { fetch(); }, [fetch]);

  const saveItem = useCallback(async (item: DbActivityInbox) => {
    // 1. Mark inbox as saved
    await supabase.from('activity_inbox').update({ status: 'saved' }).eq('id', item.id);

    // 2. Create activity
    const paceText = item.avg_pace ?? '5:00/km';
    const paceParts = paceText.replace(/\s/g, '').replace('/km', '').replace('/KM', '').split(':');
    const paceSec = paceParts.length === 2
      ? parseInt(paceParts[0]) * 60 + parseInt(paceParts[1])
      : null;

    await supabase.from('activities').insert({
      athlete_id: item.athlete_id,
      workout_id: item.suggested_workout_id ?? null,
      title: item.title,
      format: item.raw_source.includes('FIT') ? 'FIT' : item.raw_source.includes('GPX') ? 'GPX' : 'MANUAL',
      start_time: new Date(item.activity_date).toISOString(),
      distance_km: item.distance_km ?? 0,
      duration_sec: item.duration_sec ?? 0,
      avg_pace: paceText,
      avg_pace_sec: paceSec,
      elevation_gain_m: item.elevation_gain_m ?? 0,
      elevation_loss_m: item.elevation_gain_m ?? 0, // approx
      calories: item.calories ?? 0,
      avg_heart_rate: item.avg_heart_rate ?? null,
      max_heart_rate: item.max_heart_rate ?? null,
      avg_cadence: item.avg_cadence ?? null,
      is_matched: !!item.suggested_workout_id,
      match_confidence: item.match_confidence_pct ?? null,
      notes: item.notes ?? null,
    });

    setInbox(prev => prev.filter(i => i.id !== item.id));
  }, []);

  const discardItem = useCallback(async (id: string) => {
    await supabase.from('activity_inbox').update({ status: 'discarded' }).eq('id', id);
    setInbox(prev => prev.filter(i => i.id !== id));
  }, []);

  return { inbox, loading, error, saveItem, discardItem, refetch: fetch };
}
