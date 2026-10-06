-- ============================================================================
-- RUNOVA — Migration 5: Indexes & Seed Data
-- ============================================================================

-- ============================================================================
-- INDEXES (for production query performance)
-- ============================================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- athletes
CREATE INDEX IF NOT EXISTS idx_athletes_user_id ON public.athletes(user_id);
CREATE INDEX IF NOT EXISTS idx_athletes_coach_id ON public.athletes(coach_id);
CREATE INDEX IF NOT EXISTS idx_athletes_club_id ON public.athletes(club_id);
CREATE INDEX IF NOT EXISTS idx_athletes_status ON public.athletes(status) WHERE soft_deleted_at IS NULL;

-- coach_athlete_relations
CREATE INDEX IF NOT EXISTS idx_car_coach_id ON public.coach_athlete_relations(coach_id);
CREATE INDEX IF NOT EXISTS idx_car_athlete_id ON public.coach_athlete_relations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_car_status ON public.coach_athlete_relations(status);

-- workouts
CREATE INDEX IF NOT EXISTS idx_workouts_target_date ON public.workouts(target_date) WHERE soft_deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workouts_coach_id ON public.workouts(coach_id);
CREATE INDEX IF NOT EXISTS idx_workouts_plan_id ON public.workouts(plan_id);
CREATE INDEX IF NOT EXISTS idx_workouts_group_id ON public.workouts(group_id);

-- workout_assignments
CREATE INDEX IF NOT EXISTS idx_wa_athlete_id ON public.workout_assignments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_wa_workout_id ON public.workout_assignments(workout_id);
CREATE INDEX IF NOT EXISTS idx_wa_status ON public.workout_assignments(status);
CREATE INDEX IF NOT EXISTS idx_wa_athlete_status ON public.workout_assignments(athlete_id, status);

-- activities
CREATE INDEX IF NOT EXISTS idx_activities_athlete_id ON public.activities(athlete_id) WHERE soft_deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON public.activities(start_time DESC) WHERE soft_deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_athlete_time ON public.activities(athlete_id, start_time DESC) WHERE soft_deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_workout_id ON public.activities(workout_id);

-- laps
CREATE INDEX IF NOT EXISTS idx_laps_activity_id ON public.laps(activity_id);

-- gps_points
CREATE INDEX IF NOT EXISTS idx_gps_activity_id ON public.gps_points(activity_id);
CREATE INDEX IF NOT EXISTS idx_gps_order ON public.gps_points(activity_id, point_order);

-- races
CREATE INDEX IF NOT EXISTS idx_races_athlete_id ON public.races(athlete_id);
CREATE INDEX IF NOT EXISTS idx_races_event_date ON public.races(event_date);
CREATE INDEX IF NOT EXISTS idx_races_status ON public.races(status);

-- activity_inbox
CREATE INDEX IF NOT EXISTS idx_inbox_athlete_id ON public.activity_inbox(athlete_id);
CREATE INDEX IF NOT EXISTS idx_inbox_status ON public.activity_inbox(status);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- weekly_summaries
CREATE INDEX IF NOT EXISTS idx_weekly_athlete ON public.weekly_summaries(athlete_id);
CREATE INDEX IF NOT EXISTS idx_weekly_date ON public.weekly_summaries(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_athlete_date ON public.weekly_summaries(athlete_id, week_start DESC);

-- user_achievements
CREATE INDEX IF NOT EXISTS idx_ua_athlete_id ON public.user_achievements(athlete_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);

-- plan_assignments
CREATE INDEX IF NOT EXISTS idx_pa_athlete_id ON public.plan_assignments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_pa_active ON public.plan_assignments(athlete_id, is_active) WHERE is_active;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('activity-files', 'activity-files', false, 52428800, -- 50MB
    ARRAY['application/octet-stream', 'application/gpx+xml', 'application/fit', 'application/vnd.ant.fit'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for avatars (public read, owner write)
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS for activity files (private, owner only)
CREATE POLICY "activity_files_owner" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'activity-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- SEED: Achievement catalog
-- ============================================================================
INSERT INTO public.achievements (key, name, description, icon, category, points) VALUES
  ('first_run', 'Primera Zancada', 'Completaste tu primera actividad en RUNOVA', '🏃', 'milestone', 10),
  ('5k_first', '5K Completado', 'Corriste tu primer 5K registrado', '🎯', 'milestone', 20),
  ('10k_first', '10K Conquistado', 'Completaste tu primer 10K', '🏅', 'milestone', 50),
  ('21k_first', 'Medio Maratonista', 'Completaste tu primera media maratón', '🥈', 'milestone', 100),
  ('42k_first', 'Maratonista', 'Completaste tu primer maratón', '🥇', 'milestone', 500),
  ('100km_club', 'Club 100K', 'Acumulaste 100 km de carrera en RUNOVA', '💯', 'milestone', 100),
  ('500km_club', 'Club 500K', 'Acumulaste 500 km de carrera', '🔥', 'milestone', 500),
  ('1000km_club', 'Centurión 1000K', '1,000 km acumulados — leyenda del asfalto', '⚡', 'milestone', 1000),
  ('week_warrior', 'Guerrero Semanal', '7 días consecutivos con actividad registrada', '⚔️', 'consistency', 150),
  ('month_master', 'Maestro Mensual', '30 días sin fallar un entrenamiento asignado', '🛡️', 'consistency', 300),
  ('perfect_week', 'Semana Perfecta', 'Cumpliste el 100% de los entrenamientos en una semana', '✅', 'consistency', 75),
  ('pr_5k', 'PR 5K', 'Estableciste un nuevo récord personal en 5K', '🚀', 'performance', 100),
  ('pr_10k', 'PR 10K', 'Nuevo récord personal en 10K', '💥', 'performance', 150),
  ('pr_21k', 'PR Media', 'Nuevo récord personal en media maratón', '🏆', 'performance', 250),
  ('pr_42k', 'PR Maratón', 'Nuevo récord personal en maratón', '👑', 'performance', 500),
  ('high_cadence', 'Metronomo', 'Mantuviste >180 spm durante 5K continuos', '🥁', 'performance', 75),
  ('zone2_master', 'Máquina Aeróbica', '10h de entrenamiento en Zona 2 acumuladas', '💚', 'performance', 200)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SEED: Demo data (will be superseded by real user data)
-- Only insert if no profiles exist (fresh DB)
-- ============================================================================
DO $$
BEGIN
  -- Only seed if the DB is fresh (no real users)
  IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN

    -- Demo Club
    INSERT INTO public.clubs (id, name, slug, description, location, is_verified)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Puerto Tejada Runners',
      'puerto-tejada-runners',
      'Centro de alto rendimiento y desarrollo atlético para corredores de ruta, pista y fondo.',
      'Valle del Cauca / Cauca, Colombia',
      true
    );

    RAISE NOTICE 'Demo club created. To add demo users, register through the app UI.';
  END IF;
END $$;
