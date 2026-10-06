/**
 * RUNOVA — DB row → domain model mappers
 * Fills defaults for nullable / missing columns so UI can rely on domain shapes.
 */

import type {
  Activity,
  ActivityFormat,
  ActivityInboxItem,
  Athlete,
  Club,
  DbActivity,
  DbActivityInbox,
  DbAthlete,
  DbClub,
  DbDevice,
  DbDeviceAssignment,
  DbGoal,
  DbGroup,
  DbRace,
  DbRaceMilestone,
  DbWorkout,
  DbWorkoutAssignment,
  DbWorkoutBlock,
  Device,
  DeviceAssignment,
  Goal,
  Group,
  HrZones,
  MetricSource,
  OperationalStatus,
  Race,
  RaceMilestone,
  Workout,
  WorkoutAssignment,
  WorkoutBlock,
} from '@/types/database';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_HR_ZONES: Athlete['zones'] = {
  zone1: { min: 110, max: 132, label: 'Recuperación' },
  zone2: { min: 133, max: 151, label: 'Aeróbico' },
  zone3: { min: 152, max: 165, label: 'Tempo' },
  zone4: { min: 166, max: 178, label: 'Umbral' },
  zone5: { min: 179, max: 195, label: 'Máxima' },
};

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Elite'] as const;
const DISTANCES = ['5K', '10K', '21K', '42K', 'Trail', 'Ultra'] as const;
const WORKOUT_CATEGORIES = [
  'Intervalos',
  'Rodaje',
  'Fondo',
  'Recuperación',
  'Cuestas',
  'Test',
] as const;
const RACE_CATEGORIES = ['5K', '10K', '21K', '42K', 'Trail', 'Ultra'] as const;
const DEVICE_BRANDS = [
  'Garmin',
  'Apple',
  'Polar',
  'Coros',
  'Wahoo',
  'Suunto',
  'Generic',
] as const;

function asLevel(v: string | null | undefined): Athlete['level'] {
  return (LEVELS as readonly string[]).includes(v ?? '')
    ? (v as Athlete['level'])
    : 'Intermedio';
}

function asDistance(v: string | null | undefined): Athlete['preferred_distance'] {
  return (DISTANCES as readonly string[]).includes(v ?? '')
    ? (v as Athlete['preferred_distance'])
    : '10K';
}

function asWorkoutCategory(v: string | null | undefined): Workout['category'] {
  return (WORKOUT_CATEGORIES as readonly string[]).includes(v ?? '')
    ? (v as Workout['category'])
    : 'Rodaje';
}

function asRaceCategory(v: string | null | undefined): Race['category'] {
  return (RACE_CATEGORIES as readonly string[]).includes(v ?? '')
    ? (v as Race['category'])
    : '10K';
}

function asDeviceBrand(v: string | null | undefined): Device['brand'] {
  return (DEVICE_BRANDS as readonly string[]).includes(v ?? '')
    ? (v as Device['brand'])
    : 'Generic';
}

function mapHrZones(zones: HrZones | null | undefined): Athlete['zones'] {
  if (!zones?.zone1) return DEFAULT_HR_ZONES;
  return {
    zone1: {
      min: zones.zone1.min ?? DEFAULT_HR_ZONES.zone1.min,
      max: zones.zone1.max ?? DEFAULT_HR_ZONES.zone1.max,
      label: 'Recuperación',
    },
    zone2: {
      min: zones.zone2?.min ?? DEFAULT_HR_ZONES.zone2.min,
      max: zones.zone2?.max ?? DEFAULT_HR_ZONES.zone2.max,
      label: 'Aeróbico',
    },
    zone3: {
      min: zones.zone3?.min ?? DEFAULT_HR_ZONES.zone3.min,
      max: zones.zone3?.max ?? DEFAULT_HR_ZONES.zone3.max,
      label: 'Tempo',
    },
    zone4: {
      min: zones.zone4?.min ?? DEFAULT_HR_ZONES.zone4.min,
      max: zones.zone4?.max ?? DEFAULT_HR_ZONES.zone4.max,
      label: 'Umbral',
    },
    zone5: {
      min: zones.zone5?.min ?? DEFAULT_HR_ZONES.zone5.min,
      max: zones.zone5?.max ?? DEFAULT_HR_ZONES.zone5.max,
      label: 'Máxima',
    },
  };
}

function formatDuration(sec: number | null | undefined): string {
  const s = Math.max(0, Math.floor(sec ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
  return `${m}:${String(r).padStart(2, '0')}`;
}

function parseTimeToSec(t: string | null | undefined): number | null {
  if (!t) return null;
  const parts = t.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function weeksUntil(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  if (Number.isNaN(target)) return 0;
  const diff = target - Date.now();
  return Math.max(0, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
}

// ─── Athletes ────────────────────────────────────────────────────────────────

export function mapDbAthleteToAthlete(row: DbAthlete | Record<string, unknown>): Athlete {
  const r = row as DbAthlete;
  const records = r.personal_records ?? {};

  return {
    id: r.id,
    user_id: r.user_id ?? '',
    club_id: r.club_id ?? '',
    coach_id: r.coach_id ?? '',
    group_id: r.group_id ?? undefined,
    full_name: r.full_name ?? 'Atleta',
    avatar_url: r.avatar_url ?? undefined,
    date_of_birth: r.date_of_birth ?? '2000-01-01',
    gender: r.gender ?? 'OTHER',
    weight_kg: Number(r.weight_kg ?? 70),
    height_cm: Number(r.height_cm ?? 170),
    level: asLevel(r.level),
    running_years: Number(r.running_years ?? 0),
    preferred_distance: asDistance(r.preferred_distance),
    hr_max: r.hr_max ?? 190,
    hr_resting: r.hr_resting ?? 52,
    vo2_max: Number(r.vo2_max ?? 50),
    vo2_max_source: (r.vo2_max_source as MetricSource) ?? 'calculated',
    threshold_pace: r.threshold_pace ?? '5:00/km',
    cadence_target: r.cadence_target ?? 170,
    stride_length_cm: r.stride_length_cm ?? 120,
    hrv_baseline_ms: r.hrv_baseline_ms ?? undefined,
    spo2_baseline: r.spo2_baseline ?? undefined,
    status: (r.status as OperationalStatus) ?? 'no_data',
    ready_score: r.ready_score ?? 0,
    acute_load: Number(r.acute_load ?? 0),
    chronic_load: Number(r.chronic_load ?? 0),
    acwr: Number(r.acwr ?? 0),
    compliance_rate: Number(r.compliance_rate ?? 0),
    zones: mapHrZones(r.hr_zones),
    records: {
      distance_5k: records.distance_5k,
      distance_10k: records.distance_10k,
      distance_21k: records.distance_21k,
      distance_42k: records.distance_42k,
      longest_run_km: records.longest_run_km,
    },
    created_at: r.created_at,
  };
}

// ─── Workouts ────────────────────────────────────────────────────────────────

export function mapDbWorkoutBlockToWorkoutBlock(row: DbWorkoutBlock): WorkoutBlock {
  return {
    id: row.id,
    order: row.block_order,
    type: row.block_type,
    repetitions: row.repetitions ?? 1,
    distance_meters: row.distance_meters ?? undefined,
    duration_seconds: row.duration_seconds ?? undefined,
    target_pace_min: row.target_pace_min ?? undefined,
    target_pace_max: row.target_pace_max ?? undefined,
    target_hr_zone: row.target_hr_zone ?? undefined,
    description: row.description ?? '',
  };
}

export function mapDbWorkoutToWorkout(
  row: DbWorkout,
  blocks: DbWorkoutBlock[] = []
): Workout {
  return {
    id: row.id,
    title: row.title,
    category: asWorkoutCategory(row.category),
    target_date: row.target_date,
    coach_id: row.coach_id,
    group_id: row.group_id ?? undefined,
    total_distance_km: Number(row.total_distance_km ?? 0),
    estimated_duration_min: row.estimated_duration_min ?? 0,
    target_pace: row.target_pace ?? '',
    target_hr_zone: row.target_hr_zone ?? '',
    objective: row.objective ?? '',
    blocks: blocks
      .slice()
      .sort((a, b) => a.block_order - b.block_order)
      .map(mapDbWorkoutBlockToWorkoutBlock),
    created_at: row.created_at,
  };
}

export function mapDbAssignmentToAssignment(row: DbWorkoutAssignment): WorkoutAssignment {
  return {
    id: row.id,
    workout_id: row.workout_id,
    athlete_id: row.athlete_id,
    status: (row.status as WorkoutAssignment['status']) ?? 'pending',
    assigned_at: row.assigned_at,
    completed_at: row.completed_at ?? undefined,
    compliance_score: row.compliance_score != null ? Number(row.compliance_score) : undefined,
  };
}

// ─── Activities ──────────────────────────────────────────────────────────────

export function mapDbActivityToActivity(row: DbActivity): Activity {
  return {
    id: row.id,
    athlete_id: row.athlete_id,
    workout_id: row.workout_id ?? undefined,
    device_id: row.device_id ?? undefined,
    title: row.title,
    start_time: row.start_time,
    format: (row.format as ActivityFormat) ?? 'MANUAL',
    distance_km: Number(row.distance_km ?? 0),
    duration_sec: row.duration_sec ?? 0,
    avg_pace: row.avg_pace ?? '',
    max_pace: row.max_pace ?? '',
    avg_speed_kmh: Number(row.avg_speed_kmh ?? 0),
    max_speed_kmh: Number(row.max_speed_kmh ?? 0),
    elevation_gain_m: row.elevation_gain_m ?? 0,
    elevation_loss_m: row.elevation_loss_m ?? 0,
    calories: row.calories ?? 0,
    avg_heart_rate: row.avg_heart_rate ?? 0,
    max_heart_rate: row.max_heart_rate ?? 0,
    time_in_zones: row.time_in_zones ?? undefined,
    avg_cadence: row.avg_cadence ?? undefined,
    max_cadence: row.max_cadence ?? undefined,
    avg_stride_length_m: row.avg_stride_length_m != null ? Number(row.avg_stride_length_m) : undefined,
    vertical_oscillation_cm:
      row.vertical_oscillation_cm != null ? Number(row.vertical_oscillation_cm) : undefined,
    ground_contact_time_ms: row.ground_contact_time_ms ?? undefined,
    power_avg_watts: row.power_avg_watts ?? undefined,
    vo2_max_recorded: row.vo2_max_recorded != null ? Number(row.vo2_max_recorded) : undefined,
    vo2_max_source: row.vo2_max_source ?? undefined,
    spo2_avg: row.spo2_avg ?? undefined,
    hrv_avg_ms: row.hrv_avg_ms ?? undefined,
    training_effect:
      row.aerobic_training_effect != null || row.anaerobic_training_effect != null
        ? {
            aerobic: Number(row.aerobic_training_effect ?? 0),
            anaerobic: Number(row.anaerobic_training_effect ?? 0),
          }
        : undefined,
    gps_route: [],
    laps: [],
    is_matched: Boolean(row.is_matched),
    match_confidence: row.match_confidence ?? undefined,
    notes: row.notes ?? undefined,
    source_sync_id: row.source_sync_id ?? undefined,
  };
}

// ─── Inbox ───────────────────────────────────────────────────────────────────

export function mapDbInboxToInboxItem(
  row: DbActivityInbox,
  athleteName?: string
): ActivityInboxItem {
  return {
    id: row.id,
    athlete_id: row.athlete_id,
    athlete_name: athleteName ?? 'Atleta',
    raw_source: (row.raw_source as ActivityInboxItem['raw_source']) || 'FIT File',
    device_model: row.device_model ?? '',
    title: row.title,
    synced_at: row.synced_at,
    activity_date: row.activity_date,
    distance_km: Number(row.distance_km ?? 0),
    duration_formatted: formatDuration(row.duration_sec),
    duration_sec: row.duration_sec ?? 0,
    avg_pace: row.avg_pace ?? '',
    avg_heart_rate: row.avg_heart_rate ?? 0,
    max_heart_rate: row.max_heart_rate ?? 0,
    avg_cadence: row.avg_cadence ?? 0,
    elevation_gain_m: row.elevation_gain_m ?? 0,
    calories: row.calories ?? 0,
    suggested_workout_id: row.suggested_workout_id ?? undefined,
    match_confidence_pct: row.match_confidence_pct ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
  };
}

// ─── Devices ─────────────────────────────────────────────────────────────────

export function mapDbDeviceToDevice(row: DbDevice, currentAthleteName?: string): Device {
  const rawStatus = row.device_status ?? (row.is_assigned ? 'assigned' : 'idle');
  const status: Device['status'] =
    rawStatus === 'low_battery' || rawStatus === 'disconnected'
      ? rawStatus === 'low_battery'
        ? 'disconnected'
        : 'disconnected'
      : (rawStatus as Device['status']);

  return {
    id: row.id,
    name: row.name,
    brand: asDeviceBrand(row.brand),
    model: row.model,
    type: row.type,
    serial_number: row.serial_number ?? '',
    battery_level: row.battery_level ?? undefined,
    is_coach_owned: row.is_coach_owned,
    owner_id: row.owner_id,
    is_assigned: row.is_assigned,
    current_athlete_name: currentAthleteName,
    status,
    last_sync_at: row.last_sync_at ?? undefined,
  };
}

export function mapDbDeviceAssignmentToAssignment(row: DbDeviceAssignment): DeviceAssignment {
  return {
    id: row.id,
    device_id: row.device_id,
    athlete_id: row.athlete_id,
    coach_id: row.coach_id,
    workout_id: row.workout_id ?? undefined,
    assigned_at: row.assigned_at,
    released_at: row.released_at ?? undefined,
    notes: row.notes ?? undefined,
  };
}

// ─── Races ───────────────────────────────────────────────────────────────────

export function mapDbRaceMilestoneToMilestone(row: DbRaceMilestone): RaceMilestone {
  return {
    label: row.label,
    completed: row.is_completed,
    target_value: row.target_value ?? '',
    date: row.milestone_date ?? undefined,
  };
}

export function mapDbRaceToRace(
  row: DbRace,
  milestones: DbRaceMilestone[] = []
): Race {
  const targetSec = row.target_time_sec ?? parseTimeToSec(row.target_time);
  const prSec = row.pr_time_sec ?? parseTimeToSec(row.pr_time);
  const prDiff =
    targetSec != null && prSec != null ? targetSec - prSec : 0;

  return {
    id: row.id,
    athlete_id: row.athlete_id,
    name: row.name,
    distance_km: Number(row.distance_km ?? 0),
    category: asRaceCategory(row.category),
    event_date: row.event_date,
    location: row.location ?? '',
    target_time: row.target_time ?? '',
    target_pace: row.target_pace ?? '',
    pr_time: row.pr_time ?? '',
    pr_diff_sec: prDiff,
    preparation_score: row.preparation_score ?? 0,
    training_weeks_left: weeksUntil(row.event_date),
    key_milestones: milestones
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapDbRaceMilestoneToMilestone),
    linked_plan_id: row.plan_assignment_id ?? undefined,
    status: row.status === 'dnf' ? 'completed' : (row.status as Race['status']),
    notes: row.notes ?? undefined,
  };
}

// ─── Club / Group / Goal ─────────────────────────────────────────────────────

export function mapDbClubToClub(row: DbClub, membersCount = 0): Club {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url ?? undefined,
    description: row.description ?? undefined,
    head_coach_id: row.head_coach_id ?? '',
    location: row.location ?? '',
    members_count: membersCount,
    created_at: row.created_at,
  };
}

export function mapDbGroupToGroup(row: DbGroup, memberCount = 0): Group {
  return {
    id: row.id,
    club_id: row.club_id,
    coach_id: row.coach_id,
    name: row.name,
    description: row.description ?? '',
    category: (row.category as Group['category']) || 'Principiantes',
    member_count: memberCount,
  };
}

export function mapDbGoalToGoal(row: DbGoal): Goal {
  return {
    id: row.id,
    athlete_id: row.athlete_id,
    type: (row.type as Goal['type']) || 'Volume',
    target_value: row.target_value,
    current_value: row.current_value,
    progress_pct: row.progress_pct ?? 0,
    target_date: row.target_date,
    achieved: Boolean(row.is_achieved),
  };
}
