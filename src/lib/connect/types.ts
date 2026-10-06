/**
 * RUNOVA CONNECT — Smartwatch Running Engine
 * Core Domain Models & Type Contracts
 *
 * This package defines the platform-agnostic domain logic that powers RUNOVA Connect
 * on smartwatches (Apple Watch / Wear OS / Garmin Connect IQ).
 */

// ─── 1. Sensor & Device Capabilities ──────────────────────────────────────────

export type SensorType =
  | 'gps'
  | 'heart_rate'
  | 'accelerometer'
  | 'gyroscope'
  | 'barometer'
  | 'cadence'
  | 'temperature';

export interface DeviceSensorCapabilities {
  hasGps: boolean;
  hasHeartRateSensor: boolean;
  hasBarometer: boolean;
  hasCadenceSensor: boolean;
  hasHaptics: boolean;
  hasOfflineStorage: boolean;
  supportsBackgroundTracking: boolean;
  batteryLevelPercent: number;
  platform: 'watchos' | 'wearos' | 'garmin_ciq' | 'simulator';
  modelName: string;
}

// ─── 2. Watch Workout Prescription ────────────────────────────────────────────

export type WatchWorkoutCategory =
  | 'Intervalos'
  | 'Rodaje'
  | 'Fondo'
  | 'Recuperación'
  | 'Cuestas'
  | 'Test';

export type WatchBlockType = 'warmup' | 'interval' | 'recovery' | 'steady' | 'cooldown';

export interface WatchWorkoutBlock {
  id: string;
  order: number;
  type: WatchBlockType;
  repetitions: number;
  distanceMeters?: number;
  durationSeconds?: number;
  targetPaceMin?: string; // e.g. "4:20"
  targetPaceMax?: string; // e.g. "4:35"
  targetHrMin?: number;   // e.g. 160
  targetHrMax?: number;   // e.g. 170
  targetHrZone?: string;  // e.g. "Z4"
  description: string;
}

export interface WatchWorkout {
  id: string;
  title: string;
  category: WatchWorkoutCategory;
  targetDate: string;
  totalDistanceKm: number;
  estimatedDurationMin: number;
  coachId?: string;
  coachName?: string;
  athleteId: string;
  athleteName: string;
  targetPace: string;
  targetHrZone: string;
  objective?: string;
  blocks: WatchWorkoutBlock[];
  prescribedAt: string;
}

// ─── 3. Telemetry & Live Metrics ──────────────────────────────────────────────

export interface TelemetryFrame {
  timestampMs: number;
  elapsedSeconds: number;
  distanceMeters: number;
  currentPaceSecKm: number;
  currentPaceFormatted: string; // e.g. "04:26 /km"
  averagePaceSecKm: number;
  averagePaceFormatted: string;
  heartRateBpm: number;
  heartRateZone: 1 | 2 | 3 | 4 | 5;
  cadenceSpm: number;
  elevationMeters: number;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

// ─── 4. Interval & Lap Execution ──────────────────────────────────────────────

export interface WatchLapRecord {
  lapIndex: number;
  blockType: WatchBlockType;
  distanceMeters: number;
  durationSeconds: number;
  avgPaceFormatted: string;
  targetPaceFormatted?: string;
  paceDeviationSec: number; // positive: slower than target, negative: faster
  avgHeartRateBpm: number;
  targetHrBpm?: number;
  targetHrZone?: string;
  complianceScore: number; // 0 - 100% adherence to planned target
  isCompleted: boolean;
}

// ─── 5. Workout Engine State Machine ──────────────────────────────────────────

export type WatchEngineState =
  | 'READY'             // Workout loaded, awaiting athlete press "INICIAR"
  | 'COUNTDOWN'         // 3.. 2.. 1.. haptic countdown
  | 'RUNNING'           // Active tracking
  | 'PAUSED'            // Athlete stopped at traffic light or paused
  | 'COMPLETED'         // Finished, review summary
  | 'SAVED_OFFLINE'     // Written to watch flash memory / SQLite
  | 'SYNCED';           // Uploaded to RUNOVA Cloud

// ─── 6. Intelligent Real-Time Alerts ──────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'alert' | 'success';

export interface WatchAlert {
  id: string;
  timestamp: number;
  type:
    | 'PACE_TOO_FAST'
    | 'PACE_TOO_SLOW'
    | 'HR_ZONE_HIGH'
    | 'HR_ZONE_LOW'
    | 'INTERVAL_NEXT'
    | 'TARGET_REACHED'
    | 'LAP_COMPLETED';
  title: string;
  message: string;
  shortCode: string; // e.g. "⚡ BAJA RITMO", "🟠 ACELERA", "♥ ZONA 5", "NEXT → 800m"
  severity: AlertSeverity;
  hapticPattern: 'single' | 'double' | 'buzz' | 'pulse';
}

// ─── 7. Offline-First Recorded Session ────────────────────────────────────────

export interface WatchCompletedSession {
  id: string;
  workoutId?: string; // Links back to planned workout if matched
  athleteId: string;
  title: string;
  startTime: string;
  endTime: string;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  avgPaceFormatted: string;
  avgHeartRateBpm: number;
  maxHeartRateBpm: number;
  avgCadenceSpm: number;
  elevationGainMeters: number;
  laps: WatchLapRecord[];
  samplesCount: number;
  isStructured: boolean;
  complianceOverallPct: number;
  deviceInfo: {
    platform: string;
    model: string;
    batteryStart: number;
    batteryEnd: number;
  };
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  localCreatedAt: string;
  syncedAt?: string;
}

// ─── 8. Sync Protocol Contracts ───────────────────────────────────────────────

export interface WatchSyncPayload {
  deviceUuid: string;
  pendingSessions: WatchCompletedSession[];
  lastSyncedTimestamp: string;
}

export interface WatchSyncResponse {
  success: boolean;
  acceptedSessionIds: string[];
  failedSessionIds: string[];
  newAssignedWorkouts: WatchWorkout[];
  syncedAt: string;
}
