/**
 * RUNOVA CONNECT — Workout Engine
 * Smartwatch Running State Machine & Real-Time Deviation Checker
 */

import {
  WatchWorkout,
  WatchWorkoutBlock,
  TelemetryFrame,
  WatchLapRecord,
  WatchAlert,
  WatchCompletedSession,
} from './types';

// Helper: Parse "4:30" string to seconds (270s)
export function parsePaceToSeconds(paceStr?: string): number {
  if (!paceStr || !paceStr.includes(':')) return 300;
  const clean = paceStr.replace('/km', '').trim();
  const [min, sec] = clean.split(':').map(Number);
  if (isNaN(min) || isNaN(sec)) return 300;
  return min * 60 + sec;
}

// Helper: Format seconds (270s) to "04:30 /km"
export function formatSecondsToPace(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '00:00 /km';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} /km`;
}

// Helper: Format seconds to "24:18" or "01:24:18"
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Determine Heart Rate Zone (1 to 5) based on standard Karvonen / Max HR (assumed max 190)
export function calculateHrZone(bpm: number, maxHr = 190): 1 | 2 | 3 | 4 | 5 {
  const pct = (bpm / maxHr) * 100;
  if (pct < 60) return 1;
  if (pct < 70) return 2;
  if (pct < 80) return 3;
  if (pct < 90) return 4;
  return 5;
}

export class WatchWorkoutEngine {
  private workout: WatchWorkout;
  private currentBlockIndex = 0;
  private currentLapIndex = 1;
  private lapDistanceMeters = 0;
  private lapDurationSeconds = 0;
  private laps: WatchLapRecord[] = [];
  private recentAlert: WatchAlert | null = null;
  private alertCooldownTimestamp = 0;

  constructor(workout: WatchWorkout) {
    this.workout = workout;
  }

  public getCurrentBlock(): WatchWorkoutBlock | null {
    if (!this.workout.blocks || this.workout.blocks.length === 0) return null;
    return this.workout.blocks[this.currentBlockIndex] || null;
  }

  public getBlockProgressText(elapsedDistanceMeters: number): string {
    const block = this.getCurrentBlock();
    if (!block) {
      return `${Math.round(elapsedDistanceMeters / 1000 * 10) / 10} km`;
    }
    const totalBlocks = this.workout.blocks.length;
    const currentNum = this.currentBlockIndex + 1;
    if (block.type === 'interval') {
      return `INTERVALO ${currentNum} / ${totalBlocks} · ${(block.distanceMeters || 800)}m`;
    }
    if (block.type === 'recovery') {
      return `RECUPERACIÓN ${currentNum} / ${totalBlocks} · ${(block.durationSeconds || 90)}s`;
    }
    return `BLOQUE ${currentNum} / ${totalBlocks} · ${block.description}`;
  }

  /**
   * Evaluate real-time deviation between athlete's current pace / HR and prescribed target.
   * Emits intelligent alerts designed for high-glance wrist readability.
   */
  public evaluateAlerts(frame: TelemetryFrame): WatchAlert | null {
    const now = Date.now();
    // 12-second cooldown so alerts don't spam the runner on the watch
    if (now - this.alertCooldownTimestamp < 12000) {
      return this.recentAlert;
    }

    const block = this.getCurrentBlock();
    if (!block) return null;

    // 1. Check Target Pace deviation
    if (block.targetPaceMin) {
      const targetSec = parsePaceToSeconds(block.targetPaceMin);
      const currentSec = frame.currentPaceSecKm;

      // Running > 18s/km faster than target
      if (currentSec > 0 && currentSec < targetSec - 18) {
        const alert: WatchAlert = {
          id: `alt-${now}`,
          timestamp: now,
          type: 'PACE_TOO_FAST',
          title: 'Ritmo Rápido',
          message: 'Estás corriendo más rápido del objetivo fijado',
          shortCode: '⚡ BAJA EL RITMO',
          severity: 'warning',
          hapticPattern: 'pulse',
        };
        this.recentAlert = alert;
        this.alertCooldownTimestamp = now;
        return alert;
      }

      // Running > 22s/km slower than target
      if (currentSec > targetSec + 22) {
        const alert: WatchAlert = {
          id: `alt-${now}`,
          timestamp: now,
          type: 'PACE_TOO_SLOW',
          title: 'Ritmo Lento',
          message: 'Acelera ligeramente para alcanzar el rango objetivo',
          shortCode: '🟠 ACELERA',
          severity: 'warning',
          hapticPattern: 'buzz',
        };
        this.recentAlert = alert;
        this.alertCooldownTimestamp = now;
        return alert;
      }
    }

    // 2. Check Heart Rate zone limits
    if (frame.heartRateZone === 5 && block.type !== 'interval') {
      const alert: WatchAlert = {
        id: `alt-${now}`,
        timestamp: now,
        type: 'HR_ZONE_HIGH',
        title: 'Frecuencia Cardíaca Alta',
        message: 'Entraste en Zona 5 anaeróbica',
        shortCode: '♥ ZONA 5 EXTREMA',
        severity: 'alert',
        hapticPattern: 'double',
      };
      this.recentAlert = alert;
      this.alertCooldownTimestamp = now;
      return alert;
    }

    return null;
  }

  /**
   * Complete interval lap and compare Planned vs Actual
   */
  public recordLap(durationSec: number, distanceM: number, avgPaceSec: number, avgBpm: number): WatchLapRecord {
    const block = this.getCurrentBlock();
    const targetPaceSec = block?.targetPaceMin ? parsePaceToSeconds(block.targetPaceMin) : avgPaceSec;
    const diff = Math.round(avgPaceSec - targetPaceSec);

    // Compliance: 100% if exact, reduces as difference grows
    const compliance = Math.max(0, Math.min(100, Math.round(100 - Math.abs(diff) * 2.5)));

    const lap: WatchLapRecord = {
      lapIndex: this.currentLapIndex++,
      blockType: block?.type || 'steady',
      distanceMeters: Math.round(distanceM),
      durationSeconds: Math.round(durationSec),
      avgPaceFormatted: formatSecondsToPace(avgPaceSec),
      targetPaceFormatted: block?.targetPaceMin || this.workout.targetPace,
      paceDeviationSec: diff,
      avgHeartRateBpm: Math.round(avgBpm),
      targetHrZone: block?.targetHrZone || 'Z3',
      complianceScore: compliance,
      isCompleted: true,
    };

    this.laps.push(lap);

    // Advance to next block if structured
    if (this.currentBlockIndex < (this.workout.blocks.length - 1)) {
      this.currentBlockIndex++;
    }

    return lap;
  }

  /**
   * Finalize session into offline-first payload
   */
  public finalizeSession(
    totalDistanceKm: number,
    totalDurationSec: number,
    avgBpm: number,
    maxBpm: number,
    avgCadence: number,
    elevationGain: number
  ): WatchCompletedSession {
    const avgPaceSec = totalDistanceKm > 0 ? totalDurationSec / totalDistanceKm : 300;
    const overallCompliance =
      this.laps.length > 0
        ? Math.round(this.laps.reduce((acc, l) => acc + l.complianceScore, 0) / this.laps.length)
        : 90;

    return {
      id: `wkt-run-${Date.now()}`,
      workoutId: this.workout.id,
      athleteId: this.workout.athleteId,
      title: this.workout.title,
      startTime: new Date(Date.now() - totalDurationSec * 1000).toISOString(),
      endTime: new Date().toISOString(),
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalDurationSeconds: Math.round(totalDurationSec),
      avgPaceFormatted: formatSecondsToPace(avgPaceSec),
      avgHeartRateBpm: Math.round(avgBpm),
      maxHeartRateBpm: Math.round(maxBpm),
      avgCadenceSpm: Math.round(avgCadence),
      elevationGainMeters: Math.round(elevationGain),
      laps: this.laps,
      samplesCount: Math.round(totalDurationSec / 2),
      isStructured: this.workout.blocks.length > 0,
      complianceOverallPct: overallCompliance,
      deviceInfo: {
        platform: 'watchos-ultrav2',
        model: 'Apple Watch Ultra / Garmin Forerunner 965',
        batteryStart: 95,
        batteryEnd: 88,
      },
      syncStatus: 'pending',
      localCreatedAt: new Date().toISOString(),
    };
  }
}
