/**
 * RUNOVA — Supabase Database Types (Generated + Extended)
 * Matches schema v2.0.0 — 2026-10-03
 *
 * These types reflect the ACTUAL database schema.
 * Frontend domain types (with computed fields) are in domain.types.ts
 */

// ─── Base scalar types ───────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'COACH' | 'ASSISTANT' | 'ATHLETE';
export type OperationalStatus = 'optimal' | 'attention' | 'review' | 'no_data';
export type MetricSource = 'device' | 'estimated' | 'calculated';
export type ActivityFormat = 'FIT' | 'GPX' | 'TCX' | 'CSV' | 'MANUAL' | 'LIVE';
export type DeviceType = 'smartwatch' | 'heart_rate_strap' | 'footpod' | 'cadence_sensor' | 'speed_sensor' | 'power_sensor' | 'mobile_gps';
export type WorkoutBlockType = 'warmup' | 'interval' | 'recovery' | 'steady' | 'cooldown';
export type WorkoutStatus = 'pending' | 'completed' | 'partial' | 'missed' | 'skipped';
export type PlanPhase = 'base' | 'development' | 'peak' | 'taper' | 'recovery';
export type NotificationType = 'workout_reminder' | 'plan_assigned' | 'coach_feedback' | 'achievement_unlocked' | 'race_countdown' | 'system' | 'overload_alert';
export type RaceStatus = 'upcoming' | 'completed' | 'dns' | 'dnf';
export type RelationStatus = 'active' | 'pending' | 'archived' | 'rejected';
export type OnboardingStep = 'welcome' | 'personal' | 'physical' | 'goals' | 'availability' | 'records' | 'completed';

// ─── HR Zones ────────────────────────────────────────────────────────────────
export interface HrZone {
  min: number;
  max: number;
  label: string;
}

export interface HrZones {
  zone1: HrZone;
  zone2: HrZone;
  zone3: HrZone;
  zone4: HrZone;
  zone5: HrZone;
}

export interface PaceZone {
  min_pace: string; // "6:30"
  max_pace: string;
  label: string;
}

export interface PaceZones {
  zone1: PaceZone;
  zone2: PaceZone;
  zone3: PaceZone;
  zone4: PaceZone;
  zone5: PaceZone;
}

// ─── Database Row Types ──────────────────────────────────────────────────────

export interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  onboarding_completed: boolean;
  onboarding_step: OnboardingStep;
  locale: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface DbClub {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  head_coach_id: string | null;
  location: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCoach {
  id: string;
  user_id: string;
  club_id: string | null;
  specialty: string;
  license_number: string | null;
  bio: string | null;
  created_at: string;
}

export interface DbAthlete {
  id: string;
  user_id: string;
  club_id: string | null;
  coach_id: string | null;
  group_id: string | null;

  // From profiles (denormalized)
  full_name: string | null;
  avatar_url: string | null;

  // Personal
  date_of_birth: string | null;
  gender: 'M' | 'F' | 'OTHER' | null;
  weight_kg: number | null;
  height_cm: number | null;
  level: string;
  running_years: number | null;
  preferred_distance: string | null;
  injury_history: string | null;
  medical_notes: string | null;

  // Physiological
  hr_max: number | null;
  hr_resting: number | null;
  vo2_max: number | null;
  vo2_max_source: MetricSource | null;
  vdot: number | null;
  threshold_pace: string | null;
  cadence_target: number | null;
  stride_length_cm: number | null;
  hrv_baseline_ms: number | null;
  spo2_baseline: number | null;

  // Zones (JSONB)
  hr_zones: HrZones;
  pace_zones: PaceZones | null;
  personal_records: {
    distance_5k?: string;
    distance_10k?: string;
    distance_21k?: string;
    distance_42k?: string;
    longest_run_km?: number;
  };

  // Operational
  status: OperationalStatus;
  ready_score: number;
  acute_load: number;
  chronic_load: number;
  acwr: number;
  compliance_rate: number;

  last_readiness_at: string | null;
  soft_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbGroup {
  id: string;
  club_id: string;
  coach_id: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface DbDevice {
  id: string;
  name: string;
  brand: string;
  model: string;
  type: DeviceType;
  serial_number: string | null;
  battery_level: number | null;
  is_coach_owned: boolean;
  owner_id: string;
  is_assigned: boolean;
  device_status: 'connected' | 'idle' | 'assigned' | 'disconnected' | 'low_battery';
  last_sync_at: string | null;
  created_at: string;
}

export interface DbDeviceAssignment {
  id: string;
  device_id: string;
  athlete_id: string;
  coach_id: string;
  workout_id: string | null;
  assigned_at: string;
  released_at: string | null;
  notes: string | null;
}

export interface DbTrainingPlan {
  id: string;
  coach_id: string;
  title: string;
  target_event_type: string;
  duration_weeks: number;
  description: string | null;
  level: string;
  is_active: boolean;
  created_at: string;
}

export interface DbTrainingPlanWeek {
  id: string;
  plan_id: string;
  week_number: number;
  phase: PlanPhase;
  volume_target_km: number | null;
  intensity_factor: number;
  is_recovery_week: boolean;
  notes: string | null;
  created_at: string;
}

export interface DbPlanAssignment {
  id: string;
  plan_id: string;
  athlete_id: string;
  coach_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  assigned_at: string;
  notes: string | null;
}

export interface DbWorkout {
  id: string;
  plan_id: string | null;
  plan_week_id?: string | null;
  coach_id: string;
  group_id: string | null;
  title: string;
  category: string;
  workout_type?: string;
  target_date: string;
  week_number?: number | null;
  day_of_week?: number | null;
  total_distance_km: number;
  estimated_duration_min: number;
  target_pace: string;
  target_hr_zone: string;
  objective: string | null;
  notes?: string | null;
  soft_deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DbWorkoutBlock {
  id: string;
  workout_id: string;
  block_order: number;
  block_type: WorkoutBlockType;
  repetitions: number;
  distance_meters: number | null;
  duration_seconds: number | null;
  target_pace_min: string | null;
  target_pace_max: string | null;
  target_hr_zone: number | null;
  description: string;
}

export interface DbWorkoutAssignment {
  id: string;
  workout_id: string;
  athlete_id: string;
  status: WorkoutStatus;
  compliance_score: number | null;
  assigned_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface DbActivity {
  id: string;
  athlete_id: string;
  workout_id: string | null;
  device_id: string | null;
  title: string;
  format: ActivityFormat;
  start_time: string;

  // Core metrics
  distance_km: number;
  duration_sec: number;
  avg_pace: string;
  avg_pace_sec: number | null;
  max_pace: string | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  elevation_gain_m: number;
  elevation_loss_m: number;
  calories: number;

  // Cardiac
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  time_in_zones: {
    z1_sec: number;
    z2_sec: number;
    z3_sec: number;
    z4_sec: number;
    z5_sec: number;
  } | null;

  // Dynamics
  avg_cadence: number | null;
  max_cadence: number | null;
  avg_stride_length_m: number | null;
  ground_contact_time_ms: number | null;
  vertical_oscillation_cm: number | null;
  power_avg_watts: number | null;

  // Advanced physiology
  vo2_max_recorded: number | null;
  vo2_max_source: MetricSource | null;
  spo2_avg: number | null;
  hrv_avg_ms: number | null;
  aerobic_training_effect: number | null;
  anaerobic_training_effect: number | null;

  // Status
  is_matched: boolean;
  match_confidence: number | null;
  notes: string | null;
  source_sync_id?: string | null;
  soft_deleted_at: string | null;
  created_at: string;
}

export interface DbLap {
  id: string;
  activity_id: string;
  lap_number: number;
  distance_km: number;
  duration_sec: number;
  pace: string;
  avg_hr: number | null;
  elevation_gain_m: number | null;
  cadence_avg: number | null;
}

export interface DbGpsPoint {
  id: string;
  activity_id: string;
  point_order: number;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  pace_sec_km: number | null;
  heart_rate: number | null;
  cadence: number | null;
  recorded_at: string;
}

export interface DbGoal {
  id: string;
  athlete_id: string;
  type: string;
  target_value: string;
  current_value: string;
  progress_pct: number;
  target_date: string;
  is_achieved: boolean;
  created_at: string;
}

export interface DbRace {
  id: string;
  athlete_id: string;
  plan_assignment_id: string | null;
  name: string;
  distance_km: number;
  category: string;
  event_date: string;
  location: string | null;
  target_time_sec: number | null;
  target_time: string | null;
  target_pace: string | null;
  pr_time: string | null;
  pr_time_sec: number | null;
  result_time: string | null;
  result_time_sec: number | null;
  preparation_score: number | null;
  status: RaceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRaceMilestone {
  id: string;
  race_id: string;
  label: string;
  target_value: string | null;
  achieved_value: string | null;
  is_completed: boolean;
  milestone_date: string | null;
  sort_order: number;
}

export interface DbActivityInbox {
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
  raw_file_url: string | null;
  status: 'pending' | 'analyzed' | 'saved' | 'discarded';
  notes: string | null;
  synced_at: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbAchievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'consistency' | 'performance' | 'social';
  points: number;
  created_at: string;
}

export interface DbUserAchievement {
  id: string;
  athlete_id: string;
  achievement_id: string;
  unlocked_at: string;
  context: Record<string, unknown>;
}

export interface DbCoachFeedback {
  id: string;
  workout_assignment_id: string;
  coach_id: string;
  athlete_id: string;
  rating: number | null;
  feedback_text: string;
  suggested_adjustments: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWeeklySummary {
  id: string;
  athlete_id: string;
  week_start: string;
  total_distance_km: number;
  total_duration_sec: number;
  total_activities: number;
  avg_pace_sec: number | null;
  total_elevation_m: number;
  total_calories: number;
  ctl_end: number | null;
  atl_end: number | null;
  tsb_end: number | null;
  compliance_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbCoachAthleteRelation {
  id: string;
  coach_id: string;
  athlete_id: string;
  status: RelationStatus;
  invited_at: string;
  accepted_at: string | null;
  archived_at: string | null;
  notes: string | null;
}

export interface DbOnboardingData {
  id: string;
  user_id: string;
  current_step: OnboardingStep;
  personal_data: Record<string, unknown>;
  physical_data: Record<string, unknown>;
  goals_data: Record<string, unknown>;
  availability_data: Record<string, unknown>;
  records_data: Record<string, unknown>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Utility types ───────────────────────────────────────────────────────────

/** Full athlete profile with joined profile data */
export interface AthleteWithProfile extends DbAthlete {
  profiles?: DbProfile;
}

/** Workout with blocks */
export interface WorkoutWithBlocks extends DbWorkout {
  workout_blocks?: DbWorkoutBlock[];
}

/** Activity with laps */
export interface ActivityWithLaps extends DbActivity {
  laps?: DbLap[];
}

/** Race with milestones */
export interface RaceWithMilestones extends DbRace {
  race_milestones?: DbRaceMilestone[];
}

/** Notification count summary */
export interface NotificationSummary {
  total: number;
  unread: number;
}

/** Supabase generic error */
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Common query options */
export interface QueryOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  ascending?: boolean;
}


// ─── Frontend Domain Models & Legacy Compatibility ───────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  head_coach_id: string;
  location: string;
  members_count: number;
  created_at: string;
}

export interface Coach {
  id: string;
  user_id: string;
  club_id: string;
  specialty: string;
  license_number?: string;
  bio?: string;
  athletes_count: number;
}

export interface Athlete {
  id: string;
  user_id: string;
  club_id: string;
  coach_id: string;
  group_id?: string;
  
  // Personal & Biometrics
  full_name: string;
  avatar_url?: string;
  date_of_birth: string;
  gender: 'M' | 'F' | 'OTHER';
  weight_kg: number;
  height_cm: number;
  level: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Elite';
  running_years: number;
  preferred_distance: '5K' | '10K' | '21K' | '42K' | 'Trail' | 'Ultra';
  
  // Physiological data
  hr_max: number;
  hr_resting: number;
  vo2_max: number;
  vo2_max_source: MetricSource;
  threshold_pace: string; // e.g. "4:15/km"
  critical_speed_ms?: number;
  cadence_target: number;
  stride_length_cm: number;
  hrv_baseline_ms?: number;
  spo2_baseline?: number;
  
  // Operational Status
  status: OperationalStatus;
  ready_score: number; // 0 - 100
  acute_load: number;
  chronic_load: number;
  acwr: number; // Acute:Chronic Workload Ratio
  compliance_rate: number; // percentage
  
  // Heart Rate Zones (bpm ranges)
  zones: {
    zone1: { min: number; max: number; label: 'Recuperación' };
    zone2: { min: number; max: number; label: 'Aeróbico' };
    zone3: { min: number; max: number; label: 'Tempo' };
    zone4: { min: number; max: number; label: 'Umbral' };
    zone5: { min: number; max: number; label: 'Máxima' };
  };
  
  records: {
    distance_5k?: string;
    distance_10k?: string;
    distance_21k?: string;
    distance_42k?: string;
    longest_run_km?: number;
  };
  
  assigned_device_id?: string;
  created_at: string;
}

export interface Group {
  id: string;
  club_id: string;
  coach_id: string;
  name: string;
  description: string;
  category: 'Principiantes' | '5K' | '10K' | 'Media Maratón' | 'Competición' | 'Trail';
  member_count: number;
  target_event?: string;
}

export interface Device {
  id: string;
  name: string;
  brand: 'Garmin' | 'Apple' | 'Polar' | 'Coros' | 'Wahoo' | 'Suunto' | 'Generic';
  model: string;
  type: DeviceType;
  serial_number: string;
  battery_level?: number;
  is_coach_owned: boolean; // Trainer pool vs athlete personal
  owner_id: string; // coach_id or athlete_id
  is_assigned: boolean;
  current_athlete_name?: string;
  status: 'connected' | 'idle' | 'assigned' | 'disconnected';
  last_sync_at?: string;
}

export interface DeviceAssignment {
  id: string;
  device_id: string;
  athlete_id: string;
  coach_id: string;
  workout_id?: string;
  assigned_at: string;
  released_at?: string;
  notes?: string;
}

export interface WorkoutBlock {
  id: string;
  order: number;
  type: 'warmup' | 'interval' | 'recovery' | 'steady' | 'cooldown';
  repetitions: number;
  distance_meters?: number;
  duration_seconds?: number;
  target_pace_min?: string; // "4:15"
  target_pace_max?: string; // "4:25"
  target_hr_zone?: number; // 1 - 5
  description: string;
}

export interface Workout {
  id: string;
  title: string;
  category: 'Intervalos' | 'Rodaje' | 'Fondo' | 'Recuperación' | 'Cuestas' | 'Test';
  target_date: string;
  coach_id: string;
  group_id?: string;
  athlete_id?: string;
  total_distance_km: number;
  estimated_duration_min: number;
  target_pace: string;
  target_hr_zone: string;
  objective: string;
  blocks: WorkoutBlock[];
  created_at: string;
}

export interface WorkoutAssignment {
  id: string;
  workout_id: string;
  athlete_id: string;
  status: 'pending' | 'completed' | 'missed' | 'deviated';
  assigned_at: string;
  completed_at?: string;
  compliance_score?: number;
}

export interface GPSPoint {
  lat: number;
  lng: number;
  elevation_m: number;
  pace_sec_km: number;
  heart_rate: number;
  cadence: number;
  timestamp: string;
}

export interface LapSplit {
  lap: number;
  distance_km: number;
  duration_sec: number;
  pace: string;
  avg_hr: number;
  elevation_gain_m: number;
  cadence_avg: number;
}

export interface Activity {
  id: string;
  athlete_id: string;
  workout_id?: string; // matched planned workout
  device_id?: string;
  title: string;
  start_time: string;
  format: ActivityFormat;
  
  // Core metrics
  distance_km: number;
  duration_sec: number;
  avg_pace: string;
  max_pace: string;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  calories: number;
  
  // Cardiac & Biometric
  avg_heart_rate: number;
  max_heart_rate: number;
  time_in_zones?: {
    z1_sec: number;
    z2_sec: number;
    z3_sec: number;
    z4_sec: number;
    z5_sec: number;
  };
  
  // Dynamics (when available)
  avg_cadence?: number;
  max_cadence?: number;
  avg_stride_length_m?: number;
  vertical_oscillation_cm?: number;
  ground_contact_time_ms?: number;
  power_avg_watts?: number;
  
  // Advanced Physiology
  vo2_max_recorded?: number;
  vo2_max_source?: MetricSource;
  spo2_avg?: number;
  hrv_avg_ms?: number;
  training_effect?: {
    aerobic: number; // 0.0 - 5.0
    anaerobic: number; // 0.0 - 5.0
  };
  
  // Telemetry
  gps_route: GPSPoint[];
  laps: LapSplit[];
  
  // Validation against plan
  is_matched: boolean;
  match_confidence?: number;
  notes?: string;
  source_sync_id?: string;
}

export interface PlanVsActualComparison {
  workout_id: string;
  activity_id: string;
  athlete_name: string;
  workout_title: string;
  date: string;
  
  planned: {
    distance_km: number;
    pace: string;
    duration_min: number;
    hr_zone: string;
    cadence: number;
  };
  actual: {
    distance_km: number;
    pace: string;
    duration_min: number;
    hr_zone: string;
    cadence: number;
    avg_hr: number;
  };
  
  compliance: {
    overall_score: number; // 0 - 100%
    distance_diff_km: number;
    pace_diff_sec: number;
    pace_status: 'faster' | 'on_target' | 'slower';
    hr_adherence: number;
  };
  
  feedback?: string;
}

export interface PerformanceRadar {
  aerobic: number;     // 0 - 100
  speed: number;       // 0 - 100
  endurance: number;   // 0 - 100
  consistency: number; // 0 - 100
  load_management: number; // 0 - 100
  recovery: number;    // 0 - 100
  overall_index: number;
}

export interface Goal {
  id: string;
  athlete_id: string;
  type: '5K' | '10K' | '21K' | '42K' | 'Trail' | 'Consistency' | 'Volume';
  target_value: string; // e.g. "sub 20:00" or "40 km/sem"
  current_value: string;
  progress_pct: number;
  target_date: string;
  achieved: boolean;
}

// ==========================================
// SECCIÓN 9: ACTIVITY INBOX
// ==========================================
export interface ActivityInboxItem {
  id: string;
  athlete_id: string;
  athlete_name: string;
  raw_source: 'Garmin Connect' | 'Apple Watch' | 'COROS' | 'Polar' | 'FIT File' | 'GPX File' | 'Strava Sync';
  device_model: string;
  title: string;
  synced_at: string;
  activity_date: string;
  distance_km: number;
  duration_formatted: string;
  duration_sec: number;
  avg_pace: string;
  avg_heart_rate: number;
  max_heart_rate: number;
  avg_cadence: number;
  elevation_gain_m: number;
  calories: number;
  suggested_workout_id?: string;
  suggested_workout_title?: string;
  match_confidence_pct?: number;
  status: 'pending' | 'analyzed' | 'saved' | 'discarded';
  notes?: string;
}

// ==========================================
// SECCIÓN 17: RUNOVA RACE CENTER
// ==========================================
export interface RaceMilestone {
  label: string;
  completed: boolean;
  target_value: string;
  date?: string;
}

export interface Race {
  id: string;
  athlete_id: string;
  name: string; // e.g. "Cali 10K 2026"
  distance_km: number;
  category: '5K' | '10K' | '21K' | '42K' | 'Trail' | 'Ultra';
  event_date: string; // "2026-11-15T07:00:00"
  location: string;
  target_time: string; // "48:00"
  target_pace: string; // "4:48/km"
  pr_time: string; // "49:32"
  pr_diff_sec: number; // -92 sec (faster)
  preparation_score: number; // 0 - 100
  training_weeks_left: number;
  key_milestones: RaceMilestone[];
  linked_plan_id?: string;
  linked_plan_name?: string;
  status: 'upcoming' | 'completed' | 'dns';
  notes?: string;
}

// ==========================================
// SECCIÓN 10 & 11: DIGITAL PERFORMANCE MODEL & EVOLUTION
// ==========================================
export interface DigitalPerformancePoint {
  date: string;
  day_label: string;
  fitness_ctl: number; // Chronic Training Load (42-day rolling)
  fatigue_atl: number; // Acute Training Load (7-day rolling)
  form_tsb: number;    // Training Stress Balance (CTL - ATL)
  daily_load: number;
  mileage_km: number;
}

export interface PerformanceEvolutionTrend {
  month: string;
  vo2_max: number;
  pace_min_km: string;
  volume_km: number;
  avg_hr_threshold: number;
  consistency_pct: number;
  notes: string;
}

// ==========================================
// SECCIÓN 4: RUNOVA READINESS TRANSPARENTE
// ==========================================
export interface ReadinessSubScore {
  value: number | null;
  weight_pct: number;
  label: string;
  unit?: string;
  status: 'optimal' | 'moderate' | 'low' | 'missing';
}

export interface RunovaReadinessState {
  score: number | null;
  is_limited: boolean;
  category_label: 'LISTO PARA ENTRENAR' | 'RECUPERACIÓN RECOMENDADA' | 'READINESS LIMITADO';
  subscores: {
    recovery: ReadinessSubScore;
    load: ReadinessSubScore;
    trend: ReadinessSubScore;
    sleep: ReadinessSubScore;
  };
  missing_factors: string[];
  formula_explanation: string;
  disclaimer: string;
}
