-- ============================================================================
-- RUNOVA — RUNNING INTELLIGENCE PLATFORM
-- Complete PostgreSQL Schema for Supabase
-- Version: 1.0.0
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'COACH', 'ASSISTANT', 'ATHLETE');
CREATE TYPE operational_status AS ENUM ('optimal', 'attention', 'review', 'no_data');
CREATE TYPE metric_source AS ENUM ('device', 'estimated', 'calculated');
CREATE TYPE activity_format AS ENUM ('FIT', 'GPX', 'TCX', 'CSV', 'MANUAL', 'LIVE');
CREATE TYPE device_type AS ENUM (
  'smartwatch', 
  'heart_rate_strap', 
  'footpod', 
  'cadence_sensor', 
  'speed_sensor', 
  'power_sensor', 
  'mobile_gps'
);
CREATE TYPE workout_block_type AS ENUM ('warmup', 'interval', 'recovery', 'steady', 'cooldown');

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'ATHLETE',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Clubs
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  head_coach_id UUID REFERENCES public.profiles(id),
  location TEXT NOT NULL DEFAULT 'Colombia',
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Coaches
CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  specialty TEXT NOT NULL DEFAULT 'Fondo & Medio Fondo',
  license_number TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Training Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Principiantes', '5K', '10K', 'Media Maratón', 'Competición', 'Trail')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. Athletes
CREATE TABLE IF NOT EXISTS public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  
  -- Personal data
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'OTHER')),
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  level TEXT NOT NULL DEFAULT 'Intermedio',
  running_years NUMERIC(4,1) DEFAULT 2.0,
  preferred_distance TEXT DEFAULT '10K',
  
  -- Physiological
  hr_max INT DEFAULT 190,
  hr_resting INT DEFAULT 52,
  vo2_max NUMERIC(4,1) DEFAULT 52.0,
  vo2_max_source metric_source DEFAULT 'calculated',
  threshold_pace TEXT DEFAULT '4:20/km',
  cadence_target INT DEFAULT 176,
  stride_length_cm INT DEFAULT 128,
  hrv_baseline_ms INT DEFAULT 65,
  spo2_baseline INT DEFAULT 98,
  
  -- Readiness & Load
  status operational_status DEFAULT 'optimal',
  ready_score INT DEFAULT 82 CHECK (ready_score BETWEEN 0 AND 100),
  acute_load NUMERIC(6,1) DEFAULT 450.0,
  chronic_load NUMERIC(6,1) DEFAULT 410.0,
  acwr NUMERIC(4,2) DEFAULT 1.10,
  compliance_rate NUMERIC(5,2) DEFAULT 92.5,
  
  -- Heart rate zones configuration (JSONB for flexibility)
  hr_zones JSONB NOT NULL DEFAULT '{
    "zone1": {"min": 110, "max": 132, "label": "Recuperación"},
    "zone2": {"min": 133, "max": 151, "label": "Aeróbico"},
    "zone3": {"min": 152, "max": 165, "label": "Tempo"},
    "zone4": {"min": 166, "max": 178, "label": "Umbral"},
    "zone5": {"min": 179, "max": 195, "label": "Máxima"}
  }',
  
  personal_records JSONB NOT NULL DEFAULT '{
    "distance_5k": "19:42",
    "distance_10k": "41:15",
    "distance_21k": "1:32:10",
    "longest_run_km": 28.5
  }',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. Devices (Coach Pool and Personal Athlete Devices)
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  type device_type NOT NULL,
  serial_number TEXT UNIQUE,
  battery_level INT DEFAULT 95,
  is_coach_owned BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_assigned BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Device Assignments (Temporary loan from coach to athlete)
CREATE TABLE IF NOT EXISTS public.device_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  workout_id UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  released_at TIMESTAMPTZ,
  notes TEXT
);

-- 8. Training Plans
CREATE TABLE IF NOT EXISTS public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_event_type TEXT NOT NULL,
  duration_weeks INT NOT NULL DEFAULT 8,
  description TEXT,
  level TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. Workouts (Planned Workouts)
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.training_plans(id) ON DELETE SET NULL,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Intervalos', 'Rodaje', 'Fondo', 'Recuperación', 'Cuestas', 'Test')),
  target_date DATE NOT NULL,
  total_distance_km NUMERIC(5,2) NOT NULL,
  estimated_duration_min INT NOT NULL,
  target_pace TEXT NOT NULL,
  target_hr_zone TEXT NOT NULL,
  objective TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 10. Workout Blocks
CREATE TABLE IF NOT EXISTS public.workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  block_order INT NOT NULL,
  block_type workout_block_type NOT NULL,
  repetitions INT NOT NULL DEFAULT 1,
  distance_meters INT,
  duration_seconds INT,
  target_pace_min TEXT,
  target_pace_max TEXT,
  target_hr_zone INT,
  description TEXT NOT NULL
);

-- 11. Workout Assignments
CREATE TABLE IF NOT EXISTS public.workout_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'deviated')),
  compliance_score NUMERIC(5,2),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ
);

-- 12. Activities (Normalized Running Activities)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  format activity_format NOT NULL DEFAULT 'MANUAL',
  start_time TIMESTAMPTZ NOT NULL,
  
  -- Core metrics
  distance_km NUMERIC(6,2) NOT NULL,
  duration_sec INT NOT NULL,
  avg_pace TEXT NOT NULL,
  max_pace TEXT,
  avg_speed_kmh NUMERIC(4,1),
  max_speed_kmh NUMERIC(4,1),
  elevation_gain_m INT DEFAULT 0,
  elevation_loss_m INT DEFAULT 0,
  calories INT DEFAULT 0,
  
  -- Cardiac & Physiological
  avg_heart_rate INT,
  max_heart_rate INT,
  time_in_zones JSONB,
  avg_cadence INT,
  max_cadence INT,
  avg_stride_length_m NUMERIC(4,2),
  ground_contact_time_ms INT,
  vertical_oscillation_cm NUMERIC(4,1),
  power_avg_watts INT,
  
  vo2_max_recorded NUMERIC(4,1),
  vo2_max_source metric_source,
  spo2_avg INT,
  hrv_avg_ms INT,
  aerobic_training_effect NUMERIC(3,1),
  anaerobic_training_effect NUMERIC(3,1),
  
  -- Status
  is_matched_with_plan BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 13. Laps / Splits
CREATE TABLE IF NOT EXISTS public.laps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  lap_number INT NOT NULL,
  distance_km NUMERIC(5,2) NOT NULL,
  duration_sec INT NOT NULL,
  pace TEXT NOT NULL,
  avg_hr INT,
  elevation_gain_m INT,
  cadence_avg INT
);

-- 14. GPS Points
CREATE TABLE IF NOT EXISTS public.gps_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  point_order INT NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  elevation_m NUMERIC(6,1),
  pace_sec_km INT,
  heart_rate INT,
  cadence INT,
  recorded_at TIMESTAMPTZ NOT NULL
);

-- 15. Goals
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target_value TEXT NOT NULL,
  current_value TEXT NOT NULL,
  progress_pct INT NOT NULL DEFAULT 0,
  target_date DATE NOT NULL,
  is_achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 16. Workout Analyses (Plan vs Realized Analysis)
CREATE TABLE IF NOT EXISTS public.workout_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  compliance_score NUMERIC(5,2) NOT NULL,
  distance_diff_km NUMERIC(5,2),
  pace_diff_sec INT,
  pace_status TEXT CHECK (pace_status IN ('faster', 'on_target', 'slower')),
  hr_adherence NUMERIC(5,2),
  coach_feedback TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_analyses ENABLE ROW LEVEL SECURITY;

-- Sample Policies
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Athletes can view their own activities" 
ON public.activities FOR SELECT TO authenticated 
USING (athlete_id IN (SELECT id FROM public.athletes WHERE user_id = auth.uid()));

CREATE POLICY "Coaches can view activities of their club athletes" 
ON public.activities FOR SELECT TO authenticated 
USING (athlete_id IN (
  SELECT a.id FROM public.athletes a 
  JOIN public.coaches c ON a.coach_id = c.id 
  WHERE c.user_id = auth.uid()
));
