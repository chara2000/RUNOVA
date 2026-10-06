/**
 * RUNOVA — Production data layer (Supabase)
 *
 * SCHEMA CAVEAT — athletes.user_id:
 * Historically NOT NULL UNIQUE → profiles(id). That blocks coach-created
 * "managed" athletes without an auth account.
 *
 * Migration (shipped with this PR):
 *   supabase/migrations/20261006000001_prod_nullable_athlete_user.sql
 * makes user_id nullable and replaces UNIQUE with a partial unique index.
 *
 * createAthlete inserts without user_id when omitted (managed athlete).
 * createAthleteForProfile links an existing profile / auth user.
 *
 * NOTE: After that migration, handle_new_user()'s
 *   ON CONFLICT (user_id) DO NOTHING
 * should become
 *   ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO NOTHING
 * (or upsert by another unique key) — update in a follow-up migration.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Activity,
  ActivityInboxItem,
  Athlete,
  Club,
  Device,
  DeviceAssignment,
  Goal,
  Group,
  Race,
  UserRole,
  Workout,
  WorkoutAssignment,
  WorkoutBlock,
  DbAthlete,
  DbWorkout,
  DbWorkoutBlock,
  DbActivity,
  DbActivityInbox,
  DbDevice,
  DbRace,
  DbRaceMilestone,
  DbClub,
  DbGroup,
  DbGoal,
  DbWorkoutAssignment,
} from '@/types/database';
import {
  mapDbActivityToActivity,
  mapDbAthleteToAthlete,
  mapDbClubToClub,
  mapDbDeviceAssignmentToAssignment,
  mapDbDeviceToDevice,
  mapDbGoalToGoal,
  mapDbGroupToGroup,
  mapDbInboxToInboxItem,
  mapDbRaceToRace,
  mapDbAssignmentToAssignment,
  mapDbWorkoutBlockToWorkoutBlock,
  mapDbWorkoutToWorkout,
} from './mappers';

export interface AuthState {
  user: {
    id: string;
    email: string;
    full_name?: string;
    role?: UserRole;
  } | null;
  session: unknown | null;
  isAuthenticated: boolean;
}

function requireSupabase(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
}

function throwDb(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(val?: string | null): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

// ============================================================================
// 1. SECURE AUTHENTICATION (Supabase Auth GoTrue)
// ============================================================================

export const authService = {
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (err) {
      console.warn('Error fetching session:', err);
      return null;
    }
  },

  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) return null;

      const role = (user.user_metadata?.role as UserRole) || 'ATHLETE';
      const full_name =
        user.user_metadata?.full_name || user.email?.split('@')[0] || 'Corredor';

      return {
        id: user.id,
        email: user.email || '',
        full_name,
        role,
      };
    } catch (err) {
      console.warn('Error fetching current user:', err);
      return null;
    }
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'ATHLETE'
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================================================
// 2. PRODUCTION DATABASE REPOSITORY
// ============================================================================

export const runovaDb = {
  async checkTablesStatus(): Promise<{ migrated: boolean; error?: string }> {
    requireSupabase();
    try {
      const { error } = await supabase.from('athletes').select('id').limit(1);
      if (error) return { migrated: false, error: error.message };
      return { migrated: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { migrated: false, error: message };
    }
  },

  // ── Athletes ─────────────────────────────────────────────────────────────

  async listAthletes(): Promise<Athlete[]> {
    requireSupabase();
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .is('soft_deleted_at', null)
      .order('full_name', { ascending: true });

    if (error) throwDb(error, 'Error al listar atletas');
    return (data as DbAthlete[] | null)?.map(mapDbAthleteToAthlete) ?? [];
  },

  async getAthlete(id: string): Promise<Athlete> {
    requireSupabase();
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', id)
      .is('soft_deleted_at', null)
      .maybeSingle();

    if (error) throwDb(error, `Error al obtener atleta ${id}`);
    if (!data) throw new Error(`Atleta no encontrado: ${id}`);
    return mapDbAthleteToAthlete(data as DbAthlete);
  },

  /**
   * Create a club-managed athlete (user_id optional after nullable migration).
   * Prefer createAthleteForProfile when the athlete already has an auth account.
   */
  async createAthlete(payload: Partial<Athlete> & { full_name?: string }): Promise<Athlete> {
    requireSupabase();
    const insert: Record<string, unknown> = {
      full_name: payload.full_name ?? 'Nuevo atleta',
      club_id: payload.club_id || null,
      coach_id: payload.coach_id || null,
      group_id: payload.group_id || null,
      level: payload.level ?? 'Intermedio',
      preferred_distance: payload.preferred_distance ?? '10K',
      gender: payload.gender ?? null,
      date_of_birth: payload.date_of_birth ?? null,
      weight_kg: payload.weight_kg ?? null,
      height_cm: payload.height_cm ?? null,
      hr_max: payload.hr_max ?? null,
      hr_resting: payload.hr_resting ?? null,
      vo2_max: payload.vo2_max ?? null,
      threshold_pace: payload.threshold_pace ?? null,
      status: payload.status ?? 'no_data',
    };

    // Only set user_id when provided (requires migration for NULL managed athletes)
    if (payload.user_id) {
      insert.user_id = payload.user_id;
    }

    if (payload.zones) {
      insert.hr_zones = payload.zones;
    }
    if (payload.records) {
      insert.personal_records = payload.records;
    }
    if (payload.avatar_url) {
      insert.avatar_url = payload.avatar_url;
    }

    const { data, error } = await supabase
      .from('athletes')
      .insert([insert])
      .select('*')
      .single();

    if (error) throwDb(error, 'Error al crear atleta');
    return mapDbAthleteToAthlete(data as DbAthlete);
  },

  async createAthleteForProfile(
    userId: string,
    data: Partial<Athlete> & { full_name?: string } = {}
  ): Promise<Athlete> {
    return this.createAthlete({ ...data, user_id: userId });
  },

  // ── Workouts ─────────────────────────────────────────────────────────────

  async listWorkouts(): Promise<Workout[]> {
    requireSupabase();
    let { data, error } = await supabase
      .from('workouts')
      .select('*')
      .is('soft_deleted_at', null)
      .order('target_date', { ascending: false });

    if (error && error.message?.includes('soft_deleted_at')) {
      const fallback = await supabase
        .from('workouts')
        .select('*')
        .order('target_date', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throwDb(error, 'Error al listar workouts');
    const rows = (data as DbWorkout[] | null) ?? [];
    if (rows.length === 0) return [];

    const ids = rows.map((w) => w.id);
    const { data: blocks, error: blocksError } = await supabase
      .from('workout_blocks')
      .select('*')
      .in('workout_id', ids);

    if (blocksError) throwDb(blocksError, 'Error al cargar bloques de workout');

    const byWorkout = new Map<string, DbWorkoutBlock[]>();
    for (const b of (blocks as DbWorkoutBlock[] | null) ?? []) {
      const list = byWorkout.get(b.workout_id) ?? [];
      list.push(b);
      byWorkout.set(b.workout_id, list);
    }

    return rows.map((w) => mapDbWorkoutToWorkout(w, byWorkout.get(w.id) ?? []));
  },

  async createWorkout(
    payload: Partial<Workout> & {
      title: string;
      coach_id: string;
      target_date: string;
      category?: string;
      total_distance_km?: number;
      estimated_duration_min?: number;
      target_pace?: string;
      target_hr_zone?: string;
    }
  ): Promise<Workout> {
    requireSupabase();
    const insert = {
      title: payload.title,
      coach_id: payload.coach_id,
      group_id: payload.group_id ?? null,
      category: payload.category ?? 'Rodaje',
      target_date: payload.target_date,
      total_distance_km: payload.total_distance_km ?? 0,
      estimated_duration_min: payload.estimated_duration_min ?? 0,
      target_pace: payload.target_pace ?? '',
      target_hr_zone: payload.target_hr_zone ?? '',
      objective: payload.objective ?? null,
    };

    const { data, error } = await supabase
      .from('workouts')
      .insert([insert])
      .select('*')
      .single();

    if (error) throwDb(error, 'Error al crear workout');
    const workout = data as DbWorkout;

    if (payload.blocks?.length) {
      await this.replaceWorkoutBlocks(workout.id, payload.blocks);
      return mapDbWorkoutToWorkout(workout, await this._fetchBlocksRaw(workout.id));
    }

    return mapDbWorkoutToWorkout(workout, []);
  },

  async updateWorkout(id: string, patch: Partial<Workout>): Promise<Workout> {
    requireSupabase();
    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.target_date !== undefined) update.target_date = patch.target_date;
    if (patch.group_id !== undefined) update.group_id = patch.group_id;
    if (patch.total_distance_km !== undefined) update.total_distance_km = patch.total_distance_km;
    if (patch.estimated_duration_min !== undefined) {
      update.estimated_duration_min = patch.estimated_duration_min;
    }
    if (patch.target_pace !== undefined) update.target_pace = patch.target_pace;
    if (patch.target_hr_zone !== undefined) update.target_hr_zone = patch.target_hr_zone;
    if (patch.objective !== undefined) update.objective = patch.objective;

    const { data, error } = await supabase
      .from('workouts')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throwDb(error, `Error al actualizar workout ${id}`);

    if (patch.blocks) {
      await this.replaceWorkoutBlocks(id, patch.blocks);
    }

    return mapDbWorkoutToWorkout(data as DbWorkout, await this._fetchBlocksRaw(id));
  },

  async deleteWorkout(id: string): Promise<void> {
    requireSupabase();
    // Prefer soft delete when column exists (schema has soft_deleted_at)
    const { error: softError } = await supabase
      .from('workouts')
      .update({ soft_deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (!softError) return;

    // Fallback: hard delete if soft column unavailable
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) throwDb(error, `Error al eliminar workout ${id}`);
  },

  async listWorkoutBlocks(workoutId: string): Promise<WorkoutBlock[]> {
    requireSupabase();
    const rows = await this._fetchBlocksRaw(workoutId);
    return rows
      .slice()
      .sort((a, b) => a.block_order - b.block_order)
      .map(mapDbWorkoutBlockToWorkoutBlock);
  },

  async _fetchBlocksRaw(workoutId: string): Promise<DbWorkoutBlock[]> {
    const { data, error } = await supabase
      .from('workout_blocks')
      .select('*')
      .eq('workout_id', workoutId)
      .order('block_order', { ascending: true });

    if (error) throwDb(error, 'Error al listar bloques');
    return (data as DbWorkoutBlock[] | null) ?? [];
  },

  async replaceWorkoutBlocks(
    workoutId: string,
    blocks: Array<Partial<WorkoutBlock> & { description: string; type?: WorkoutBlock['type']; order?: number }>
  ): Promise<WorkoutBlock[]> {
    requireSupabase();

    const { error: delError } = await supabase
      .from('workout_blocks')
      .delete()
      .eq('workout_id', workoutId);

    if (delError) throwDb(delError, 'Error al reemplazar bloques (delete)');

    if (!blocks.length) return [];

    const rows = blocks.map((b, i) => ({
      workout_id: workoutId,
      block_order: b.order ?? i + 1,
      block_type: b.type ?? 'steady',
      repetitions: b.repetitions ?? 1,
      distance_meters: b.distance_meters ?? null,
      duration_seconds: b.duration_seconds ?? null,
      target_pace_min: b.target_pace_min ?? null,
      target_pace_max: b.target_pace_max ?? null,
      target_hr_zone: b.target_hr_zone ?? null,
      description: b.description,
    }));

    const { data, error } = await supabase
      .from('workout_blocks')
      .insert(rows)
      .select('*');

    if (error) throwDb(error, 'Error al insertar bloques');
    return ((data as DbWorkoutBlock[] | null) ?? []).map(mapDbWorkoutBlockToWorkoutBlock);
  },

  async assignWorkout(workoutId: string, athleteIds: string[]): Promise<WorkoutAssignment[]> {
    requireSupabase();
    if (!workoutId || !isValidUUID(workoutId)) {
      console.warn(`[dbService] assignWorkout: workoutId "${workoutId}" no es un UUID válido. Asignación omitida.`);
      return [];
    }

    const validAthleteIds = (athleteIds || []).filter((id) => isValidUUID(id));
    if (!validAthleteIds.length) {
      console.warn('[dbService] assignWorkout: no se proporcionaron athleteIds válidos.');
      return [];
    }

    // Skip athletes already assigned to this workout
    const { data: existing, error: existingErr } = await supabase
      .from('workout_assignments')
      .select('athlete_id')
      .eq('workout_id', workoutId)
      .in('athlete_id', validAthleteIds);

    if (existingErr) throwDb(existingErr, 'Error al verificar asignaciones');

    const already = new Set(
      ((existing as { athlete_id: string }[] | null) ?? []).map((r) => r.athlete_id)
    );
    const toInsert = validAthleteIds.filter((id) => !already.has(id));
    if (!toInsert.length) {
      return this.listAssignments(workoutId);
    }

    const rows = toInsert.map((athlete_id) => ({
      workout_id: workoutId,
      athlete_id,
      status: 'pending' as const,
    }));

    const { error } = await supabase.from('workout_assignments').insert(rows);
    if (error) throwDb(error, 'Error al asignar workout');

    return this.listAssignments(workoutId);
  },

  async listAssignments(workoutId?: string): Promise<WorkoutAssignment[]> {
    requireSupabase();
    let query = supabase.from('workout_assignments').select('*').order('assigned_at', {
      ascending: false,
    });
    if (workoutId) {
      if (!isValidUUID(workoutId)) return [];
      query = query.eq('workout_id', workoutId);
    }

    const { data, error } = await query;
    if (error) throwDb(error, 'Error al listar asignaciones');
    return ((data as DbWorkoutAssignment[] | null) ?? []).map(mapDbAssignmentToAssignment);
  },

  // ── Activities ───────────────────────────────────────────────────────────

  async listActivities(athleteId?: string): Promise<Activity[]> {
    requireSupabase();
    let query = supabase
      .from('activities')
      .select('*')
      .is('soft_deleted_at', null)
      .order('start_time', { ascending: false });

    if (athleteId) query = query.eq('athlete_id', athleteId);

    const { data, error } = await query;
    if (error) throwDb(error, 'Error al listar actividades');
    return ((data as DbActivity[] | null) ?? []).map(mapDbActivityToActivity);
  },

  async createActivity(payload: Partial<Activity> & {
    athlete_id: string;
    title: string;
    start_time: string;
    distance_km: number;
    duration_sec: number;
    avg_pace: string;
  }): Promise<Activity> {
    requireSupabase();
    const insert: Record<string, unknown> = {
      athlete_id: payload.athlete_id,
      workout_id: payload.workout_id ?? null,
      device_id: payload.device_id ?? null,
      title: payload.title,
      format: payload.format ?? 'MANUAL',
      start_time: payload.start_time,
      distance_km: payload.distance_km,
      duration_sec: payload.duration_sec,
      avg_pace: payload.avg_pace,
      max_pace: payload.max_pace ?? null,
      avg_speed_kmh: payload.avg_speed_kmh ?? null,
      max_speed_kmh: payload.max_speed_kmh ?? null,
      elevation_gain_m: payload.elevation_gain_m ?? 0,
      elevation_loss_m: payload.elevation_loss_m ?? 0,
      calories: payload.calories ?? 0,
      avg_heart_rate: payload.avg_heart_rate ?? null,
      max_heart_rate: payload.max_heart_rate ?? null,
      time_in_zones: payload.time_in_zones ?? null,
      avg_cadence: payload.avg_cadence ?? null,
      max_cadence: payload.max_cadence ?? null,
      is_matched: payload.is_matched ?? false,
      match_confidence: payload.match_confidence ?? null,
      notes: payload.notes ?? null,
    };

    if (payload.training_effect) {
      insert.aerobic_training_effect = payload.training_effect.aerobic;
      insert.anaerobic_training_effect = payload.training_effect.anaerobic;
    }

    const { data, error } = await supabase
      .from('activities')
      .insert([insert])
      .select('*')
      .single();

    if (error) throwDb(error, 'Error al crear actividad');
    return mapDbActivityToActivity(data as DbActivity);
  },

  async deleteActivity(id: string): Promise<void> {
    requireSupabase();
    const { error: softError } = await supabase
      .from('activities')
      .update({ soft_deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (!softError) return;

    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throwDb(error, `Error al eliminar actividad ${id}`);
  },

  // ── Inbox ────────────────────────────────────────────────────────────────

  async listInbox(): Promise<ActivityInboxItem[]> {
    requireSupabase();
    const { data, error } = await supabase
      .from('activity_inbox')
      .select('*, athletes(full_name)')
      .in('status', ['pending', 'analyzed'])
      .order('created_at', { ascending: false });

    if (error) throwDb(error, 'Error al listar inbox');

    type Row = DbActivityInbox & { athletes?: { full_name: string | null } | null };
    return ((data as Row[] | null) ?? []).map((row) =>
      mapDbInboxToInboxItem(row, row.athletes?.full_name ?? undefined)
    );
  },

  async saveInboxToActivity(inboxItem: ActivityInboxItem | { id: string }): Promise<Activity> {
    requireSupabase();

    // Re-fetch canonical row to avoid stale client data
    const { data: raw, error: fetchError } = await supabase
      .from('activity_inbox')
      .select('*')
      .eq('id', inboxItem.id)
      .single();

    if (fetchError || !raw) throwDb(fetchError, 'Inbox item no encontrado');
    const item = raw as DbActivityInbox;

    const format: Activity['format'] =
      item.raw_source?.toUpperCase().includes('FIT')
        ? 'FIT'
        : item.raw_source?.toUpperCase().includes('GPX')
          ? 'GPX'
          : 'MANUAL';

    const activity = await this.createActivity({
      athlete_id: item.athlete_id,
      workout_id: item.suggested_workout_id ?? undefined,
      title: item.title,
      start_time: item.activity_date
        ? new Date(item.activity_date).toISOString()
        : new Date().toISOString(),
      format,
      distance_km: Number(item.distance_km ?? 0),
      duration_sec: item.duration_sec ?? 0,
      avg_pace: item.avg_pace ?? '0:00/km',
      avg_heart_rate: item.avg_heart_rate ?? undefined,
      max_heart_rate: item.max_heart_rate ?? undefined,
      avg_cadence: item.avg_cadence ?? undefined,
      elevation_gain_m: item.elevation_gain_m ?? 0,
      calories: item.calories ?? 0,
      is_matched: Boolean(item.suggested_workout_id),
      match_confidence: item.match_confidence_pct ?? undefined,
      notes: item.notes ?? undefined,
    });

    const { error: delError } = await supabase
      .from('activity_inbox')
      .delete()
      .eq('id', item.id);

    if (delError) throwDb(delError, 'Actividad creada pero no se pudo borrar el inbox');

    return activity;
  },

  async discardInbox(id: string): Promise<void> {
    requireSupabase();
    const { error } = await supabase.from('activity_inbox').delete().eq('id', id);
    if (error) throwDb(error, `Error al descartar inbox ${id}`);
  },

  /** @deprecated Prefer discardInbox — kept for RunovaContext until wired. */
  async discardInboxActivity(id: string): Promise<void> {
    return this.discardInbox(id);
  },

  /** @deprecated Prefer saveInboxToActivity — kept for RunovaContext until wired. */
  async saveInboxActivity(inboxItem: ActivityInboxItem | { id: string }): Promise<Activity> {
    return this.saveInboxToActivity(inboxItem);
  },

  async createInboxItem(
    payload: Partial<ActivityInboxItem> & {
      athlete_id: string;
      title: string;
      raw_source: string;
      activity_date: string;
    }
  ): Promise<ActivityInboxItem> {
    requireSupabase();
    const insert = {
      athlete_id: payload.athlete_id,
      raw_source: payload.raw_source,
      device_model: payload.device_model ?? null,
      title: payload.title,
      activity_date: payload.activity_date,
      distance_km: payload.distance_km ?? null,
      duration_sec: payload.duration_sec ?? null,
      avg_pace: payload.avg_pace ?? null,
      avg_heart_rate: payload.avg_heart_rate ?? null,
      max_heart_rate: payload.max_heart_rate ?? null,
      avg_cadence: payload.avg_cadence ?? null,
      elevation_gain_m: payload.elevation_gain_m ?? null,
      calories: payload.calories ?? null,
      suggested_workout_id: payload.suggested_workout_id ?? null,
      match_confidence_pct: payload.match_confidence_pct ?? null,
      status: payload.status ?? 'pending',
      notes: payload.notes ?? null,
    };

    const { data, error } = await supabase
      .from('activity_inbox')
      .insert([insert])
      .select('*')
      .single();

    if (error) throwDb(error, 'Error al crear item de inbox');
    return mapDbInboxToInboxItem(data as DbActivityInbox, payload.athlete_name);
  },

  // ── Devices ──────────────────────────────────────────────────────────────

  async listDevices(): Promise<Device[]> {
    requireSupabase();
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throwDb(error, 'Error al listar dispositivos');
    return ((data as DbDevice[] | null) ?? []).map((d) => mapDbDeviceToDevice(d));
  },

  async createDevice(
    payload: Partial<Device> & {
      name: string;
      brand: string;
      model: string;
      type: Device['type'];
      owner_id: string;
    }
  ): Promise<Device> {
    requireSupabase();
    const insert = {
      name: payload.name,
      brand: payload.brand,
      model: payload.model,
      type: payload.type,
      serial_number: payload.serial_number || null,
      battery_level: payload.battery_level ?? 100,
      is_coach_owned: payload.is_coach_owned ?? false,
      owner_id: payload.owner_id,
      is_assigned: false,
      device_status: 'idle',
    };

    const { data, error } = await supabase
      .from('devices')
      .insert([insert])
      .select('*')
      .single();

    if (error) throwDb(error, 'Error al crear dispositivo');
    return mapDbDeviceToDevice(data as DbDevice);
  },

  async assignDevice(assignment: {
    device_id: string;
    athlete_id: string;
    coach_id: string;
    workout_id?: string;
    notes?: string;
  }): Promise<DeviceAssignment> {
    requireSupabase();

    const { data, error } = await supabase
      .from('device_assignments')
      .insert([
        {
          device_id: assignment.device_id,
          athlete_id: assignment.athlete_id,
          coach_id: assignment.coach_id,
          workout_id: assignment.workout_id ?? null,
          notes: assignment.notes ?? null,
        },
      ])
      .select('*')
      .single();

    if (error) throwDb(error, 'Error al asignar dispositivo');

    const { error: devError } = await supabase
      .from('devices')
      .update({ is_assigned: true, device_status: 'assigned' })
      .eq('id', assignment.device_id);

    if (devError) throwDb(devError, 'Asignación creada pero no se actualizó el dispositivo');

    return mapDbDeviceAssignmentToAssignment(data);
  },

  async releaseDevice(deviceId: string, assignmentId?: string): Promise<void> {
    requireSupabase();

    if (assignmentId) {
      const { error } = await supabase
        .from('device_assignments')
        .update({ released_at: new Date().toISOString() })
        .eq('id', assignmentId);
      if (error) throwDb(error, 'Error al liberar asignación');
    } else {
      const { error } = await supabase
        .from('device_assignments')
        .update({ released_at: new Date().toISOString() })
        .eq('device_id', deviceId)
        .is('released_at', null);
      if (error) throwDb(error, 'Error al liberar asignaciones del dispositivo');
    }

    const { error: devError } = await supabase
      .from('devices')
      .update({ is_assigned: false, device_status: 'idle' })
      .eq('id', deviceId);

    if (devError) throwDb(devError, 'Error al actualizar estado del dispositivo');
  },

  async deleteDevice(id: string): Promise<void> {
    requireSupabase();
    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (error) throwDb(error, `Error al eliminar dispositivo ${id}`);
  },

  // ── Races ────────────────────────────────────────────────────────────────

  async listRaces(): Promise<Race[]> {
    requireSupabase();
    const { data, error } = await supabase
      .from('races')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) throwDb(error, 'Error al listar carreras');
    return ((data as DbRace[] | null) ?? []).map((row) => mapDbRaceToRace(row, []));
  },

  async createRace(
    payload: Partial<Race> & {
      athlete_id: string;
      name: string;
      distance_km: number;
      event_date: string;
      category?: string;
    }
  ): Promise<Race> {
    requireSupabase();
    const insert = {
      athlete_id: payload.athlete_id,
      name: payload.name,
      distance_km: payload.distance_km,
      category: payload.category ?? '10K',
      event_date: payload.event_date,
      location: payload.location ?? null,
      target_time: payload.target_time ?? null,
      target_pace: payload.target_pace ?? null,
      pr_time: payload.pr_time ?? null,
      preparation_score: payload.preparation_score ?? null,
      status: payload.status ?? 'upcoming',
      notes: payload.notes ?? null,
      key_milestones: payload.key_milestones ?? [],
    };

    const { data, error } = await supabase.from('races').insert([insert]).select('*').single();
    if (error) throwDb(error, 'Error al crear carrera');
    return mapDbRaceToRace(data as DbRace, []);
  },

  async updateRace(id: string, patch: Partial<Race>): Promise<Race> {
    requireSupabase();
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.distance_km !== undefined) update.distance_km = patch.distance_km;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.event_date !== undefined) update.event_date = patch.event_date;
    if (patch.location !== undefined) update.location = patch.location;
    if (patch.target_time !== undefined) update.target_time = patch.target_time;
    if (patch.target_pace !== undefined) update.target_pace = patch.target_pace;
    if (patch.pr_time !== undefined) update.pr_time = patch.pr_time;
    if (patch.preparation_score !== undefined) update.preparation_score = patch.preparation_score;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.linked_plan_id !== undefined) update.plan_assignment_id = patch.linked_plan_id;

    const { data, error } = await supabase
      .from('races')
      .update(update)
      .eq('id', id)
      .select('*, race_milestones(*)')
      .single();

    if (error) throwDb(error, `Error al actualizar carrera ${id}`);

    type Row = DbRace & { race_milestones?: DbRaceMilestone[] | null };
    const row = data as Row;
    return mapDbRaceToRace(row, row.race_milestones ?? []);
  },

  async deleteRace(id: string): Promise<void> {
    requireSupabase();
    const { error } = await supabase.from('races').delete().eq('id', id);
    if (error) throwDb(error, `Error al eliminar carrera ${id}`);
  },

  // ── Clubs / Groups / Goals ───────────────────────────────────────────────

  async getClub(id?: string): Promise<Club | null> {
    requireSupabase();
    let query = supabase.from('clubs').select('*').limit(1);
    if (id) {
      query = supabase.from('clubs').select('*').eq('id', id).limit(1);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throwDb(error, 'Error al obtener club');
    if (!data) return null;

    const club = data as DbClub;
    const { count } = await supabase
      .from('athletes')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', club.id)
      .is('soft_deleted_at', null);

    return mapDbClubToClub(club, count ?? 0);
  },

  async listGroups(clubId?: string): Promise<Group[]> {
    requireSupabase();
    let query = supabase.from('groups').select('*').order('name', { ascending: true });
    if (clubId) query = query.eq('club_id', clubId);

    const { data, error } = await query;
    if (error) throwDb(error, 'Error al listar grupos');

    const groups = (data as DbGroup[] | null) ?? [];
    if (!groups.length) return [];

    // member counts via athletes.group_id
    const withCounts = await Promise.all(
      groups.map(async (g) => {
        const { count } = await supabase
          .from('athletes')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', g.id)
          .is('soft_deleted_at', null);
        return mapDbGroupToGroup(g, count ?? 0);
      })
    );

    return withCounts;
  },

  async listGoals(athleteId: string): Promise<Goal[]> {
    requireSupabase();
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('target_date', { ascending: true });

    if (error) throwDb(error, 'Error al listar objetivos');
    return ((data as DbGoal[] | null) ?? []).map(mapDbGoalToGoal);
  },

  /**
   * Ensure the signed-in admin/coach has a club + coach row.
   * Idempotent: returns existing club if already linked.
   */
  async bootstrapClubIfNeeded(
    profileId: string,
    opts?: { clubName?: string; location?: string }
  ): Promise<{ club: Club; coachId: string }> {
    requireSupabase();

    // Existing coach?
    const { data: coachRow, error: coachErr } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', profileId)
      .maybeSingle();

    if (coachErr) throwDb(coachErr, 'Error al buscar coach');

    if (coachRow?.club_id) {
      const club = await this.getClub(coachRow.club_id);
      if (club) return { club, coachId: coachRow.id };
    }

    // Profile for naming
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profileId)
      .maybeSingle();

    const baseName = opts?.clubName ?? `${profile?.full_name ?? 'RUNOVA'} Club`;
    const slugBase = baseName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const slug = `${slugBase || 'runova-club'}-${profileId.slice(0, 8)}`;

    const { data: clubRow, error: clubError } = await supabase
      .from('clubs')
      .insert([
        {
          name: baseName,
          slug,
          head_coach_id: profileId,
          location: opts?.location ?? 'Colombia',
          is_verified: false,
        },
      ])
      .select('*')
      .single();

    if (clubError) throwDb(clubError, 'Error al crear club');

    let coachId = coachRow?.id as string | undefined;

    if (coachId) {
      const { error: linkError } = await supabase
        .from('coaches')
        .update({ club_id: (clubRow as DbClub).id })
        .eq('id', coachId);
      if (linkError) throwDb(linkError, 'Error al vincular coach al club');
    } else {
      const { data: newCoach, error: newCoachErr } = await supabase
        .from('coaches')
        .insert([
          {
            user_id: profileId,
            club_id: (clubRow as DbClub).id,
            specialty: 'General',
          },
        ])
        .select('id')
        .single();
      if (newCoachErr) throwDb(newCoachErr, 'Error al crear coach');
      coachId = newCoach.id;
    }

    return {
      club: mapDbClubToClub(clubRow as DbClub, 0),
      coachId: coachId!,
    };
  },

  // ── Realtime ─────────────────────────────────────────────────────────────

  subscribeToLiveTelemetry(onNewActivity: (activity: Activity) => void) {
    requireSupabase();
    const channel = supabase
      .channel('live-telemetry')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        (payload) => {
          onNewActivity(mapDbActivityToActivity(payload.new as DbActivity));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
