'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DbWorkout, DbWorkoutBlock, DbWorkoutAssignment, WorkoutStatus } from '@/types/database';

export interface WorkoutWithBlocks extends DbWorkout {
  workout_blocks: DbWorkoutBlock[];
}

export interface WorkoutAssignmentWithWorkout extends DbWorkoutAssignment {
  workouts: WorkoutWithBlocks;
}

// ─── Coach: manage workouts ──────────────────────────────────────────────────
interface UseWorkoutsReturn {
  workouts: WorkoutWithBlocks[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  createWorkout: (data: Partial<DbWorkout>, blocks?: Partial<DbWorkoutBlock>[]) => Promise<WorkoutWithBlocks>;
  updateWorkout: (id: string, updates: Partial<DbWorkout>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  assignWorkout: (workoutId: string, athleteIds: string[]) => Promise<void>;
}

interface UseWorkoutsOptions {
  coachId?: string;
  groupId?: string;
  targetDate?: string; // ISO date string
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useWorkouts(options: UseWorkoutsOptions = {}): UseWorkoutsReturn {
  const { coachId, groupId, targetDate, page = 1, pageSize = 20, enabled = true } = options;

  const [workouts, setWorkouts] = useState<WorkoutWithBlocks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('workouts')
        .select('*, workout_blocks(*)', { count: 'exact' })
        .is('soft_deleted_at', null)
        .order('target_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (coachId) query = query.eq('coach_id', coachId);
      if (groupId) query = query.eq('group_id', groupId);
      if (targetDate) query = query.eq('target_date', targetDate);

      const { data, error: dbError, count } = await query;
      if (dbError) throw new Error(dbError.message);

      setWorkouts((data as WorkoutWithBlocks[]) ?? []);
      setTotal(count ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar sesiones';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enabled, coachId, groupId, targetDate, page, pageSize]);

  useEffect(() => { fetch(); }, [fetch]);

  const createWorkout = useCallback(async (
    data: Partial<DbWorkout>,
    blocks: Partial<DbWorkoutBlock>[] = []
  ): Promise<WorkoutWithBlocks> => {
    // 1. Insert workout
    const { data: workout, error: wError } = await supabase
      .from('workouts')
      .insert({
        title: data.title ?? 'Nueva Sesión',
        category: data.category ?? 'Rodaje',
        target_date: data.target_date ?? new Date().toISOString().split('T')[0],
        coach_id: data.coach_id,
        group_id: data.group_id ?? null,
        total_distance_km: data.total_distance_km ?? 0,
        estimated_duration_min: data.estimated_duration_min ?? 30,
        target_pace: data.target_pace ?? '5:00/km',
        target_hr_zone: data.target_hr_zone ?? 'Zona 2',
        objective: data.objective ?? null,
      })
      .select()
      .single();

    if (wError || !workout) throw new Error(wError?.message ?? 'Error al crear sesión');

    // 2. Insert blocks if provided
    let insertedBlocks: DbWorkoutBlock[] = [];
    if (blocks.length > 0) {
      const { data: bData, error: bError } = await supabase
        .from('workout_blocks')
        .insert(
          blocks.map((b, i) => ({
            workout_id: workout.id,
            block_order: b.block_order ?? i + 1,
            block_type: b.block_type ?? 'steady',
            repetitions: b.repetitions ?? 1,
            distance_meters: b.distance_meters ?? null,
            duration_seconds: b.duration_seconds ?? null,
            target_pace_min: b.target_pace_min ?? null,
            target_pace_max: b.target_pace_max ?? null,
            target_hr_zone: b.target_hr_zone ?? null,
            description: b.description ?? '',
          }))
        )
        .select();

      if (bError) throw new Error(bError.message);
      insertedBlocks = bData ?? [];
    }

    const result: WorkoutWithBlocks = { ...workout, workout_blocks: insertedBlocks };
    setWorkouts(prev => [result, ...prev]);
    setTotal(prev => prev + 1);
    return result;
  }, []);

  const updateWorkout = useCallback(async (id: string, updates: Partial<DbWorkout>) => {
    const { error: dbError } = await supabase
      .from('workouts')
      .update(updates)
      .eq('id', id);
    if (dbError) throw new Error(dbError.message);
    setWorkouts(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const deleteWorkout = useCallback(async (id: string) => {
    const { error: dbError } = await supabase
      .from('workouts')
      .update({ soft_deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (dbError) throw new Error(dbError.message);
    setWorkouts(prev => prev.filter(w => w.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  const assignWorkout = useCallback(async (workoutId: string, athleteIds: string[]) => {
    const rows = athleteIds.map(athleteId => ({
      workout_id: workoutId,
      athlete_id: athleteId,
      status: 'pending' as WorkoutStatus,
    }));

    const { error: dbError } = await supabase
      .from('workout_assignments')
      .upsert(rows, { onConflict: 'workout_id,athlete_id' });

    if (dbError) throw new Error(dbError.message);
  }, []);

  return { workouts, loading, error, total, refetch: fetch, createWorkout, updateWorkout, deleteWorkout, assignWorkout };
}

// ─── Athlete: get assigned workouts ─────────────────────────────────────────
interface UseMyWorkoutsReturn {
  assignments: WorkoutAssignmentWithWorkout[];
  todayWorkout: WorkoutAssignmentWithWorkout | null;
  loading: boolean;
  error: string | null;
  markComplete: (assignmentId: string, complianceScore?: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useMyWorkouts(athleteId: string | null): UseMyWorkoutsReturn {
  const [assignments, setAssignments] = useState<WorkoutAssignmentWithWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);

    const { data, error: dbError } = await supabase
      .from('workout_assignments')
      .select('*, workouts(*, workout_blocks(*))')
      .eq('athlete_id', athleteId)
      .order('assigned_at', { ascending: false })
      .limit(50);

    if (dbError) {
      setError(dbError.message);
    } else {
      setAssignments((data as WorkoutAssignmentWithWorkout[]) ?? []);
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { fetch(); }, [fetch]);

  const today = new Date().toISOString().split('T')[0];
  const todayWorkout = assignments.find(a =>
    a.workouts?.target_date === today && a.status === 'pending'
  ) ?? null;

  const markComplete = useCallback(async (assignmentId: string, complianceScore?: number) => {
    const { error: dbError } = await supabase
      .from('workout_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        compliance_score: complianceScore ?? 100,
      })
      .eq('id', assignmentId);

    if (dbError) throw new Error(dbError.message);
    setAssignments(prev =>
      prev.map(a => a.id === assignmentId ? { ...a, status: 'completed' } : a)
    );
  }, []);

  return { assignments, todayWorkout, loading, error, markComplete, refetch: fetch };
}
