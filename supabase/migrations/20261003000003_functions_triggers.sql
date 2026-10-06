-- ============================================================================
-- RUNOVA — Migration 4: Triggers, Functions & Business Logic
-- ============================================================================

-- ============================================================================
-- 1. AUTH TRIGGER: auto-create profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_full_name TEXT;
BEGIN
  -- Safely extract role from metadata
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'ATHLETE'::user_role
  );

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  -- Create onboarding record
  INSERT INTO public.onboarding_data (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- If ATHLETE: create athlete skeleton record
  IF v_role = 'ATHLETE' THEN
    INSERT INTO public.athletes (user_id, full_name)
    VALUES (NEW.id, v_full_name)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- If COACH: create coach skeleton record
  IF v_role = 'COACH' OR v_role = 'ADMIN' THEN
    INSERT INTO public.coaches (user_id, specialty)
    VALUES (NEW.id, 'General')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Log audit
  INSERT INTO public.audit_logs (user_id, action, table_name)
  VALUES (NEW.id, 'register', 'auth.users');

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. UPDATED_AT trigger for all relevant tables
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'clubs', 'coaches', 'athletes', 
    'races', 'workouts', 'onboarding_data', 'weekly_summaries',
    'workout_assignments', 'coach_feedback'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 3. FUNCTION: Calculate HR zones from FC max & resting (Karvonen)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_hr_zones(
  p_hr_max INT,
  p_hr_resting INT
)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  hrr INT; -- Heart Rate Reserve
BEGIN
  hrr := p_hr_max - p_hr_resting;
  RETURN jsonb_build_object(
    'zone1', jsonb_build_object(
      'min', ROUND(p_hr_resting + hrr * 0.50),
      'max', ROUND(p_hr_resting + hrr * 0.59),
      'label', 'Recuperación'
    ),
    'zone2', jsonb_build_object(
      'min', ROUND(p_hr_resting + hrr * 0.60),
      'max', ROUND(p_hr_resting + hrr * 0.69),
      'label', 'Aeróbico'
    ),
    'zone3', jsonb_build_object(
      'min', ROUND(p_hr_resting + hrr * 0.70),
      'max', ROUND(p_hr_resting + hrr * 0.79),
      'label', 'Tempo'
    ),
    'zone4', jsonb_build_object(
      'min', ROUND(p_hr_resting + hrr * 0.80),
      'max', ROUND(p_hr_resting + hrr * 0.89),
      'label', 'Umbral'
    ),
    'zone5', jsonb_build_object(
      'min', ROUND(p_hr_resting + hrr * 0.90),
      'max', p_hr_max,
      'label', 'Máxima'
    )
  );
END;
$$;

-- ============================================================================
-- 4. FUNCTION: Calculate VDOT from race time (Jack Daniels formula)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_vdot(
  p_distance_km NUMERIC,
  p_time_sec INT
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_speed_m_min NUMERIC; -- meters per minute
  v_vo2 NUMERIC;         -- VO2 at race pace
  v_vo2max NUMERIC;
  pct_max NUMERIC;
BEGIN
  IF p_time_sec <= 0 OR p_distance_km <= 0 THEN
    RETURN NULL;
  END IF;

  v_speed_m_min := (p_distance_km * 1000.0) / (p_time_sec / 60.0);

  -- VO2 at this pace (Daniel's equation)
  v_vo2 := -4.60 + 0.182258 * v_speed_m_min + 0.000104 * POWER(v_speed_m_min, 2);

  -- % of VO2max utilized at this effort (depends on duration)
  -- Approximation: race durations
  pct_max := 0.8 + 0.1894393 * EXP(-0.012778 * (p_time_sec / 60.0))
             + 0.2989558 * EXP(-0.1932605 * (p_time_sec / 60.0));

  v_vo2max := v_vo2 / pct_max;

  RETURN ROUND(v_vo2max::NUMERIC, 1);
END;
$$;

-- ============================================================================
-- 5. FUNCTION: Calculate training load (TSS-like simplified)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_session_load(
  p_duration_sec INT,
  p_avg_hr INT,
  p_hr_max INT,
  p_hr_threshold INT
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_if NUMERIC; -- Intensity Factor (avg_hr / threshold_hr)
  v_tss NUMERIC; -- Training Stress Score
BEGIN
  IF p_hr_threshold = 0 OR p_hr_max = 0 THEN RETURN 0; END IF;
  v_if := p_avg_hr::NUMERIC / p_hr_threshold::NUMERIC;
  -- TSS = (duration_sec * avg_hr * IF) / (hr_threshold * 3600) * 100
  v_tss := (p_duration_sec::NUMERIC * v_if * v_if) / 3600.0 * 100.0;
  RETURN ROUND(v_tss, 1);
END;
$$;

-- ============================================================================
-- 6. FUNCTION: Get athlete dashboard data (RPC)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_athlete_dashboard(p_athlete_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_athlete RECORD;
  v_today_workout RECORD;
  v_recent_activities JSONB;
  v_weekly_km NUMERIC;
  v_result JSONB;
BEGIN
  -- Security check
  IF NOT (
    EXISTS (SELECT 1 FROM public.athletes WHERE id = p_athlete_id AND user_id = auth.uid())
    OR public.coach_manages_athlete(p_athlete_id)
    OR public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Athlete profile
  SELECT a.*, p.full_name, p.email, p.avatar_url
  INTO v_athlete
  FROM public.athletes a
  JOIN public.profiles p ON a.user_id = p.id
  WHERE a.id = p_athlete_id;

  -- Today's workout
  SELECT w.*
  INTO v_today_workout
  FROM public.workouts w
  JOIN public.workout_assignments wa ON wa.workout_id = w.id
  WHERE wa.athlete_id = p_athlete_id
    AND w.target_date = CURRENT_DATE
    AND wa.status = 'pending'
  LIMIT 1;

  -- Weekly km
  SELECT COALESCE(SUM(distance_km), 0)
  INTO v_weekly_km
  FROM public.activities
  WHERE athlete_id = p_athlete_id
    AND start_time >= date_trunc('week', now())
    AND soft_deleted_at IS NULL;

  v_result := jsonb_build_object(
    'athlete', row_to_json(v_athlete),
    'today_workout', row_to_json(v_today_workout),
    'weekly_km', v_weekly_km
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 7. FUNCTION: Mark notification as read
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = timezone('utc', now())
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid();
END;
$$;

-- ============================================================================
-- 8. FUNCTION: Update weekly summary after activity insert/update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_weekly_summary()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_week_start DATE;
  v_total_km NUMERIC;
  v_total_sec INT;
  v_total_acts INT;
  v_avg_pace_sec INT;
BEGIN
  v_week_start := date_trunc('week', NEW.start_time)::DATE;

  SELECT
    COALESCE(SUM(distance_km), 0),
    COALESCE(SUM(duration_sec), 0),
    COUNT(*),
    CASE WHEN SUM(distance_km) > 0
      THEN ROUND(SUM(duration_sec) / (SUM(distance_km)))
      ELSE NULL
    END
  INTO v_total_km, v_total_sec, v_total_acts, v_avg_pace_sec
  FROM public.activities
  WHERE athlete_id = NEW.athlete_id
    AND date_trunc('week', start_time) = date_trunc('week', NEW.start_time)
    AND soft_deleted_at IS NULL;

  INSERT INTO public.weekly_summaries (
    athlete_id, week_start, total_distance_km, total_duration_sec,
    total_activities, avg_pace_sec, updated_at
  ) VALUES (
    NEW.athlete_id, v_week_start, v_total_km, v_total_sec,
    v_total_acts, v_avg_pace_sec, timezone('utc', now())
  )
  ON CONFLICT (athlete_id, week_start) DO UPDATE SET
    total_distance_km = EXCLUDED.total_distance_km,
    total_duration_sec = EXCLUDED.total_duration_sec,
    total_activities = EXCLUDED.total_activities,
    avg_pace_sec = EXCLUDED.avg_pace_sec,
    updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_weekly_summary_trigger ON public.activities;
CREATE TRIGGER update_weekly_summary_trigger
  AFTER INSERT OR UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_weekly_summary();

-- ============================================================================
-- 9. FUNCTION: Check & unlock achievements
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_achievements(p_athlete_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_total_km NUMERIC;
  v_activity_count INT;
BEGIN
  -- Total km
  SELECT COALESCE(SUM(distance_km), 0) INTO v_total_km
  FROM public.activities WHERE athlete_id = p_athlete_id AND soft_deleted_at IS NULL;

  -- Activity count
  SELECT COUNT(*) INTO v_activity_count
  FROM public.activities WHERE athlete_id = p_athlete_id AND soft_deleted_at IS NULL;

  -- First run
  IF v_activity_count >= 1 THEN
    INSERT INTO public.user_achievements (athlete_id, achievement_id)
    SELECT p_athlete_id, id FROM public.achievements WHERE key = 'first_run'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 100km total
  IF v_total_km >= 100 THEN
    INSERT INTO public.user_achievements (athlete_id, achievement_id)
    SELECT p_athlete_id, id FROM public.achievements WHERE key = '100km_club'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 500km total
  IF v_total_km >= 500 THEN
    INSERT INTO public.user_achievements (athlete_id, achievement_id)
    SELECT p_athlete_id, id FROM public.achievements WHERE key = '500km_club'
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Trigger achievements after new activity
CREATE OR REPLACE FUNCTION public.trigger_achievement_check()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.check_achievements(NEW.athlete_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_achievements_trigger ON public.activities;
CREATE TRIGGER check_achievements_trigger
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.trigger_achievement_check();

-- ============================================================================
-- 10. Realtime: enable for notifications & coach_feedback
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_inbox;
