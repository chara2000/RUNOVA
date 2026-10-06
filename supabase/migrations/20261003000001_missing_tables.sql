-- ============================================================================
-- RUNOVA — Migration 2: Missing Tables & Schema Fixes
-- Version: 2.0.0 | 2026-10-03
-- ============================================================================

-- Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- ============================================================================
-- NEW ENUMS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE workout_status AS ENUM ('pending', 'completed', 'partial', 'missed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_phase AS ENUM ('base', 'development', 'peak', 'taper', 'recovery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'workout_reminder', 'plan_assigned', 'coach_feedback',
    'achievement_unlocked', 'race_countdown', 'system', 'overload_alert'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE race_status AS ENUM ('upcoming', 'completed', 'dns', 'dnf');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE relation_status AS ENUM ('active', 'pending', 'archived', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE onboarding_step AS ENUM (
    'welcome', 'personal', 'physical', 'goals',
    'availability', 'records', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- FIX: Add missing columns to EXISTING tables
-- ============================================================================

-- profiles: add onboarding_completed flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step onboarding_step DEFAULT 'welcome',
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'es-CO',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Bogota';

-- athletes: fix naming discrepancies & add missing columns
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS full_name TEXT,      -- duplicated from profiles for join convenience
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS injury_history TEXT,
  ADD COLUMN IF NOT EXISTS medical_notes TEXT,
  ADD COLUMN IF NOT EXISTS pace_zones JSONB DEFAULT '{
    "zone1": {"min_pace": "6:30", "max_pace": "7:30", "label": "Recuperación"},
    "zone2": {"min_pace": "5:30", "max_pace": "6:29", "label": "Aeróbico"},
    "zone3": {"min_pace": "5:00", "max_pace": "5:29", "label": "Tempo"},
    "zone4": {"min_pace": "4:20", "max_pace": "4:59", "label": "Umbral"},
    "zone5": {"min_pace": "3:40", "max_pace": "4:19", "label": "VO2 Max"}
  }',
  ADD COLUMN IF NOT EXISTS vdot NUMERIC(5,1),   -- Jack Daniels VDOT score
  ADD COLUMN IF NOT EXISTS last_readiness_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

-- devices: add missing status enum
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS device_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (device_status IN ('connected', 'idle', 'assigned', 'disconnected', 'low_battery'));

-- workouts: add fields for full plan support
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS plan_week_id UUID,   -- FK added after plan_weeks table
  ADD COLUMN IF NOT EXISTS week_number INT,
  ADD COLUMN IF NOT EXISTS day_of_week INT CHECK (day_of_week BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS workout_type TEXT NOT NULL DEFAULT 'run'
    CHECK (workout_type IN ('run', 'cross_training', 'strength', 'rest', 'test')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

-- activities: fix avg_pace to support both text and seconds
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS avg_pace_sec INT,    -- seconds per km (for queries)
  ADD COLUMN IF NOT EXISTS is_matched BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS match_confidence INT CHECK (match_confidence BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

-- workout_assignments: fix status to new enum
ALTER TABLE public.workout_assignments
  DROP CONSTRAINT IF EXISTS workout_assignments_status_check;
ALTER TABLE public.workout_assignments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- ============================================================================
-- TABLE: coach_athlete_relations (M:N with status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_athlete_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  status relation_status NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  accepted_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (coach_id, athlete_id)
);

-- ============================================================================
-- TABLE: training_plan_weeks (Periodization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.training_plan_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  week_number INT NOT NULL CHECK (week_number >= 1),
  phase plan_phase NOT NULL DEFAULT 'base',
  volume_target_km NUMERIC(5,1),
  intensity_factor NUMERIC(3,2) DEFAULT 1.0,
  is_recovery_week BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (plan_id, week_number)
);

-- Now add FK from workouts to plan_weeks
ALTER TABLE public.workouts
  ADD CONSTRAINT IF NOT EXISTS fk_workouts_plan_week
  FOREIGN KEY (plan_week_id) REFERENCES public.training_plan_weeks(id) ON DELETE SET NULL;

-- ============================================================================
-- TABLE: plan_assignments (athlete gets a full plan)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plan_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  notes TEXT,
  UNIQUE (athlete_id, plan_id)
);

-- ============================================================================
-- TABLE: races
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  plan_assignment_id UUID REFERENCES public.plan_assignments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  distance_km NUMERIC(6,3) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('5K','10K','21K','42K','Trail','Ultra','Otro')),
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  target_time_sec INT,       -- target time in seconds (for calculations)
  target_time TEXT,          -- human readable "48:00"
  target_pace TEXT,          -- "4:48/km"
  pr_time TEXT,
  pr_time_sec INT,
  result_time TEXT,
  result_time_sec INT,
  preparation_score INT CHECK (preparation_score BETWEEN 0 AND 100),
  status race_status NOT NULL DEFAULT 'upcoming',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- TABLE: race_milestones
CREATE TABLE IF NOT EXISTS public.race_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  target_value TEXT,
  achieved_value TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  milestone_date DATE,
  sort_order INT NOT NULL DEFAULT 0
);

-- ============================================================================
-- TABLE: activity_inbox (pending activities from devices/imports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  raw_source TEXT NOT NULL,    -- 'Garmin Connect', 'Apple Watch', 'FIT File', etc.
  device_model TEXT,
  title TEXT NOT NULL,
  activity_date DATE NOT NULL,
  distance_km NUMERIC(6,2),
  duration_sec INT,
  avg_pace TEXT,
  avg_heart_rate INT,
  max_heart_rate INT,
  avg_cadence INT,
  elevation_gain_m INT,
  calories INT,
  suggested_workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  match_confidence_pct INT CHECK (match_confidence_pct BETWEEN 0 AND 100),
  raw_file_url TEXT,           -- Storage URL for .fit/.gpx
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzed', 'saved', 'discarded')),
  notes TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- TABLE: achievements (Gamification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,   -- 'first_run', '100km_total', '5k_pr', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,         -- emoji or icon name
  category TEXT NOT NULL CHECK (category IN ('milestone', 'consistency', 'performance', 'social')),
  points INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  context JSONB DEFAULT '{}',  -- e.g. {"activity_id": "...", "value": 100.5}
  UNIQUE (athlete_id, achievement_id)
);

-- ============================================================================
-- TABLE: coach_feedback (per workout session)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_assignment_id UUID NOT NULL REFERENCES public.workout_assignments(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT NOT NULL,
  suggested_adjustments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- TABLE: audit_logs (Admin traceability)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,        -- 'create', 'update', 'delete', 'login', 'export'
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- TABLE: onboarding_data (stores step-by-step progress)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.onboarding_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_step onboarding_step NOT NULL DEFAULT 'welcome',
  personal_data JSONB DEFAULT '{}',
  physical_data JSONB DEFAULT '{}',
  goals_data JSONB DEFAULT '{}',
  availability_data JSONB DEFAULT '{}',
  records_data JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- TABLE: weekly_summaries (pre-calculated for performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,    -- Monday of the week
  total_distance_km NUMERIC(7,2) NOT NULL DEFAULT 0,
  total_duration_sec INT NOT NULL DEFAULT 0,
  total_activities INT NOT NULL DEFAULT 0,
  avg_pace_sec INT,
  total_elevation_m INT NOT NULL DEFAULT 0,
  total_calories INT NOT NULL DEFAULT 0,
  ctl_end NUMERIC(6,2),        -- CTL at end of week
  atl_end NUMERIC(6,2),        -- ATL at end of week
  tsb_end NUMERIC(6,2),        -- TSB at end of week
  compliance_pct NUMERIC(5,2), -- % of assigned workouts completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (athlete_id, week_start)
);

-- ============================================================================
-- Enable RLS on ALL new tables
-- ============================================================================
ALTER TABLE public.coach_athlete_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
