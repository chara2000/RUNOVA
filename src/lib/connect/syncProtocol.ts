/**
 * RUNOVA CONNECT — Offline-First Storage & Cloud Synchronization Protocol
 * Manages watch local queue and bidirectional sync with RUNOVA Cloud
 */

import { WatchCompletedSession, WatchWorkout, WatchSyncPayload, WatchSyncResponse } from './types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const WATCH_OFFLINE_STORAGE_KEY = 'runova_connect_watch_offline_sessions';
const WATCH_ACTIVE_WORKOUT_KEY = 'runova_connect_active_workout';

// ─── Sample Prescribed Workout for Wrist Execution ────────────────────────────

export const DEFAULT_WATCH_WORKOUT: WatchWorkout = {
  id: 'wkt-pista-800m',
  title: '6 × 800 m en Pista (Ritmo 10K)',
  category: 'Intervalos',
  targetDate: new Date().toISOString().split('T')[0],
  totalDistanceKm: 7.2,
  estimatedDurationMin: 42,
  athleteId: '1897ff3d-5080-4f26-9d27-27b564e2b34b',
  athleteName: 'Juan David Riascos',
  coachName: 'Coach Elena Gómez',
  targetPace: '4:30 /km',
  targetHrZone: 'Zona 4 (Umbral)',
  objective: 'Desarrollo de potencia aeróbica y velocidad sostenida a ritmo de competición 10K.',
  prescribedAt: new Date().toISOString(),
  blocks: [
    {
      id: 'b-warmup',
      order: 1,
      type: 'warmup',
      repetitions: 1,
      distanceMeters: 1500,
      targetPaceMin: '5:20',
      targetPaceMax: '5:40',
      targetHrZone: 'Z2',
      description: 'Calentamiento aeróbico suave continuo',
    },
    {
      id: 'b-int-1',
      order: 2,
      type: 'interval',
      repetitions: 6,
      distanceMeters: 800,
      targetPaceMin: '4:25',
      targetPaceMax: '4:35',
      targetHrZone: 'Z4',
      description: 'Series 800m a ritmo objetivo 10K',
    },
    {
      id: 'b-rec-1',
      order: 3,
      type: 'recovery',
      repetitions: 5,
      durationSeconds: 120,
      targetPaceMin: '6:30',
      targetHrZone: 'Z1',
      description: 'Recuperación al trote suave / caminata activa 2 min',
    },
    {
      id: 'b-cool',
      order: 4,
      type: 'cooldown',
      repetitions: 1,
      distanceMeters: 1000,
      targetPaceMin: '5:45',
      targetHrZone: 'Z1',
      description: 'Vuelta a la calma y enfriamiento regenerativo',
    },
  ],
};

// ─── Local Storage Management (Watch Flash/SQLite abstraction) ────────────────

export class WatchLocalStorageManager {
  public static getOfflineSessions(): WatchCompletedSession[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(WATCH_OFFLINE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveSessionLocally(session: WatchCompletedSession): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getOfflineSessions();
      const updated = [session, ...current.filter((s) => s.id !== session.id)];
      localStorage.setItem(WATCH_OFFLINE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[WatchLocalStorage] Error saving offline session:', e);
    }
  }

  public static markAsSynced(sessionId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getOfflineSessions();
      const updated = current.map((s) =>
        s.id === sessionId ? { ...s, syncStatus: 'synced' as const, syncedAt: new Date().toISOString() } : s
      );
      localStorage.setItem(WATCH_OFFLINE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[WatchLocalStorage] Error marking synced:', e);
    }
  }

  public static getActiveWorkout(): WatchWorkout {
    if (typeof window === 'undefined') return DEFAULT_WATCH_WORKOUT;
    try {
      const data = localStorage.getItem(WATCH_ACTIVE_WORKOUT_KEY);
      return data ? JSON.parse(data) : DEFAULT_WATCH_WORKOUT;
    } catch {
      return DEFAULT_WATCH_WORKOUT;
    }
  }

  public static setActiveWorkout(workout: WatchWorkout): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WATCH_ACTIVE_WORKOUT_KEY, JSON.stringify(workout));
  }
}

// ─── Cloud Sync Protocol (Upload sessions & Download planned workouts) ────────

export async function syncWatchWithRunovaCloud(athleteId: string): Promise<WatchSyncResponse> {
  const pendingSessions = WatchLocalStorageManager.getOfflineSessions().filter(
    (s) => s.syncStatus === 'pending' || s.syncStatus === 'failed'
  );

  const accepted: string[] = [];
  const failed: string[] = [];

  if (isSupabaseConfigured && pendingSessions.length > 0) {
    for (const session of pendingSessions) {
      try {
        // Idempotency: Check if this session was already synced to avoid duplicate activity records
        const { data: existing } = await supabase
          .from('activities')
          .select('id')
          .eq('athlete_id', athleteId)
          .eq('start_time', session.startTime)
          .limit(1);

        if (existing && existing.length > 0) {
          accepted.push(session.id);
          WatchLocalStorageManager.markAsSynced(session.id);
          continue;
        }

        const { error } = await supabase.from('activities').insert([
          {
            athlete_id: athleteId,
            title: `[Watch] ${session.title}`,
            start_time: session.startTime,
            distance_km: session.totalDistanceKm,
            duration_sec: session.totalDurationSeconds,
            avg_pace: session.avgPaceFormatted.replace('/km', '').trim(),
            avg_heart_rate: session.avgHeartRateBpm,
            max_heart_rate: session.maxHeartRateBpm,
            avg_cadence: session.avgCadenceSpm,
            elevation_gain_m: session.elevationGainMeters,
            format: 'FIT',
            source_sync_id: session.id,
            workout_id:
              session.workoutId && session.workoutId.includes('-') && session.workoutId.length > 20
                ? session.workoutId
                : null,
          },
        ]);

        if (error) {
          console.warn('[syncWatchWithRunovaCloud] Error inserting activity:', error);
          failed.push(session.id);
        } else {
          accepted.push(session.id);
          WatchLocalStorageManager.markAsSynced(session.id);
        }
      } catch (err) {
        console.warn('[syncWatchWithRunovaCloud] Network exception:', err);
        failed.push(session.id);
      }
    }
  } else {
    // Simulated graceful sync when offline or demo
    for (const s of pendingSessions) {
      accepted.push(s.id);
      WatchLocalStorageManager.markAsSynced(s.id);
    }
  }

  return {
    success: failed.length === 0,
    acceptedSessionIds: accepted,
    failedSessionIds: failed,
    newAssignedWorkouts: [DEFAULT_WATCH_WORKOUT],
    syncedAt: new Date().toISOString(),
  };
}
