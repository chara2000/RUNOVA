'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DbRace, DbRaceMilestone, RaceStatus } from '@/types/database';

export interface RaceWithMilestones extends DbRace {
  race_milestones: DbRaceMilestone[];
  training_weeks_left?: number;
}

interface UseRacesReturn {
  races: RaceWithMilestones[];
  upcomingRaces: RaceWithMilestones[];
  nextRace: RaceWithMilestones | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createRace: (data: Partial<DbRace>, milestones?: Partial<DbRaceMilestone>[]) => Promise<RaceWithMilestones>;
  updateRace: (id: string, updates: Partial<DbRace>) => Promise<void>;
  deleteRace: (id: string) => Promise<void>;
  toggleMilestone: (raceId: string, milestoneId: string, completed: boolean) => Promise<void>;
}

export function useRaces(athleteId: string | null): UseRacesReturn {
  const [races, setRaces] = useState<RaceWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from('races')
      .select('*, race_milestones(*)')
      .eq('athlete_id', athleteId)
      .order('event_date', { ascending: true });

    if (dbError) {
      setError(dbError.message);
    } else {
      const enriched = (data ?? []).map(r => ({
        ...r,
        race_milestones: r.race_milestones ?? [],
        training_weeks_left: calculateWeeksLeft(r.event_date),
      }));
      setRaces(enriched);
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upcomingRaces = races.filter(r => r.status === 'upcoming' && new Date(r.event_date) > new Date());
  const nextRace = upcomingRaces[0] ?? null;

  const createRace = useCallback(async (
    data: Partial<DbRace>,
    milestones: Partial<DbRaceMilestone>[] = []
  ): Promise<RaceWithMilestones> => {
    // Parse target time to seconds if provided
    let targetTimeSec: number | null = null;
    if (data.target_time) {
      targetTimeSec = parseTimeToSeconds(data.target_time);
    }

    const { data: race, error: rError } = await supabase
      .from('races')
      .insert({
        athlete_id: athleteId!,
        name: data.name ?? 'Nueva Competición',
        distance_km: data.distance_km ?? 10,
        category: data.category ?? '10K',
        event_date: data.event_date ?? new Date().toISOString(),
        location: data.location ?? null,
        target_time: data.target_time ?? null,
        target_time_sec: targetTimeSec,
        target_pace: data.target_pace ?? null,
        pr_time: data.pr_time ?? null,
        preparation_score: data.preparation_score ?? null,
        status: 'upcoming' as RaceStatus,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (rError || !race) throw new Error(rError?.message ?? 'Error al crear carrera');

    // Insert milestones
    let insertedMilestones: DbRaceMilestone[] = [];
    if (milestones.length > 0) {
      const { data: mData } = await supabase
        .from('race_milestones')
        .insert(milestones.map((m, i) => ({
          race_id: race.id,
          label: m.label ?? 'Hito',
          target_value: m.target_value ?? null,
          is_completed: m.is_completed ?? false,
          sort_order: m.sort_order ?? i,
        })))
        .select();
      insertedMilestones = mData ?? [];
    }

    const result: RaceWithMilestones = {
      ...race,
      race_milestones: insertedMilestones,
      training_weeks_left: calculateWeeksLeft(race.event_date),
    };

    setRaces(prev => [...prev, result].sort((a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    ));

    return result;
  }, [athleteId]);

  const updateRace = useCallback(async (id: string, updates: Partial<DbRace>) => {
    if (updates.target_time) {
      (updates as Record<string, unknown>).target_time_sec = parseTimeToSeconds(updates.target_time);
    }
    const { error: dbError } = await supabase
      .from('races')
      .update(updates)
      .eq('id', id);
    if (dbError) throw new Error(dbError.message);
    setRaces(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRace = useCallback(async (id: string) => {
    const { error: dbError } = await supabase
      .from('races')
      .delete()
      .eq('id', id);
    if (dbError) throw new Error(dbError.message);
    setRaces(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleMilestone = useCallback(async (
    raceId: string,
    milestoneId: string,
    completed: boolean
  ) => {
    const { error: dbError } = await supabase
      .from('race_milestones')
      .update({ is_completed: completed })
      .eq('id', milestoneId);

    if (dbError) throw new Error(dbError.message);

    setRaces(prev => prev.map(r => {
      if (r.id !== raceId) return r;
      return {
        ...r,
        race_milestones: r.race_milestones.map(m =>
          m.id === milestoneId ? { ...m, is_completed: completed } : m
        ),
      };
    }));
  }, []);

  return {
    races, upcomingRaces, nextRace,
    loading, error, refetch: fetch,
    createRace, updateRace, deleteRace, toggleMilestone,
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function calculateWeeksLeft(eventDate: string): number {
  const now = new Date();
  const event = new Date(eventDate);
  const diffMs = event.getTime() - now.getTime();
  const diffWeeks = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7));
  return Math.max(0, diffWeeks);
}

function parseTimeToSeconds(time: string): number {
  // Handles "48:00" (mm:ss) or "1:28:00" (hh:mm:ss)
  const parts = time.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
