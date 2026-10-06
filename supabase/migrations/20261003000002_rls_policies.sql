-- ============================================================================
-- RUNOVA — Migration 3: Complete RLS Policies
-- ALL tables covered: SELECT, INSERT, UPDATE, DELETE per role
-- ============================================================================

-- Helper function: get current user's role (server-side, no client trust)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: get current user's athlete_id
CREATE OR REPLACE FUNCTION public.get_my_athlete_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.athletes WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: get current user's coach_id
CREATE OR REPLACE FUNCTION public.get_my_coach_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN');
$$;

-- Helper: check if coach manages this athlete
CREATE OR REPLACE FUNCTION public.coach_manages_athlete(p_athlete_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_athlete_relations car
    JOIN public.coaches c ON car.coach_id = c.id
    WHERE c.user_id = auth.uid()
      AND car.athlete_id = p_athlete_id
      AND car.status = 'active'
  );
$$;

-- ============================================================================
-- DROP OLD / INCOMPLETE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Athletes can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Coaches can view activities of their club athletes" ON public.activities;

-- ============================================================================
-- PROFILES
-- ============================================================================
-- SELECT: own profile always, others if authenticated
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "profiles_select_coach_sees_athletes" ON public.profiles
  FOR SELECT TO authenticated USING (
    id IN (
      SELECT p.id FROM public.profiles p
      JOIN public.athletes a ON a.user_id = p.id
      WHERE public.coach_manages_athlete(a.id)
    )
  );

-- INSERT: only via trigger (service role), but allow if own
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- UPDATE: own profile only
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Admin: full access
CREATE POLICY "profiles_all_admin" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- CLUBS
-- ============================================================================
CREATE POLICY "clubs_select_all_authenticated" ON public.clubs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clubs_write_admin" ON public.clubs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- COACHES
-- ============================================================================
CREATE POLICY "coaches_select_authenticated" ON public.coaches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "coaches_update_own" ON public.coaches
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "coaches_insert_own" ON public.coaches
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "coaches_all_admin" ON public.coaches
  FOR ALL TO authenticated USING (public.is_admin());

-- ============================================================================
-- ATHLETES
-- ============================================================================
CREATE POLICY "athletes_select_own" ON public.athletes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "athletes_select_coach" ON public.athletes
  FOR SELECT TO authenticated USING (public.coach_manages_athlete(id));

CREATE POLICY "athletes_select_admin" ON public.athletes
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "athletes_insert_own" ON public.athletes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "athletes_update_own" ON public.athletes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "athletes_update_coach" ON public.athletes
  FOR UPDATE TO authenticated
  USING (public.coach_manages_athlete(id));

CREATE POLICY "athletes_all_admin" ON public.athletes
  FOR ALL TO authenticated USING (public.is_admin());

-- ============================================================================
-- COACH_ATHLETE_RELATIONS
-- ============================================================================
CREATE POLICY "car_select_involved" ON public.coach_athlete_relations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.athletes WHERE id = athlete_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "car_insert_coach" ON public.coach_athlete_relations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
  );

CREATE POLICY "car_update_involved" ON public.coach_athlete_relations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.athletes WHERE id = athlete_id AND user_id = auth.uid())
  );

CREATE POLICY "car_delete_coach" ON public.coach_athlete_relations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- GROUPS
-- ============================================================================
CREATE POLICY "groups_select_authenticated" ON public.groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "groups_write_coach" ON public.groups
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- TRAINING_PLANS
-- ============================================================================
CREATE POLICY "plans_select_coach_own" ON public.training_plans
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "plans_select_assigned_athlete" ON public.training_plans
  FOR SELECT TO authenticated USING (
    id IN (
      SELECT plan_id FROM public.plan_assignments
      WHERE athlete_id = public.get_my_athlete_id()
    )
  );

CREATE POLICY "plans_insert_coach" ON public.training_plans
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
  );

CREATE POLICY "plans_update_coach" ON public.training_plans
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
  );

CREATE POLICY "plans_delete_coach" ON public.training_plans
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- TRAINING_PLAN_WEEKS
-- ============================================================================
CREATE POLICY "plan_weeks_select" ON public.training_plan_weeks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.training_plans tp
      LEFT JOIN public.coaches c ON tp.coach_id = c.id AND c.user_id = auth.uid()
      LEFT JOIN public.plan_assignments pa ON tp.id = pa.plan_id AND pa.athlete_id = public.get_my_athlete_id()
      WHERE tp.id = plan_id AND (c.id IS NOT NULL OR pa.id IS NOT NULL OR public.is_admin())
    )
  );

CREATE POLICY "plan_weeks_write_coach" ON public.training_plan_weeks
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.training_plans tp
      JOIN public.coaches c ON tp.coach_id = c.id
      WHERE tp.id = plan_id AND c.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- ============================================================================
-- WORKOUTS
-- ============================================================================
CREATE POLICY "workouts_select_coach_own" ON public.workouts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "workouts_select_assigned_athlete" ON public.workouts
  FOR SELECT TO authenticated USING (
    id IN (
      SELECT workout_id FROM public.workout_assignments
      WHERE athlete_id = public.get_my_athlete_id()
    )
  );

CREATE POLICY "workouts_insert_coach" ON public.workouts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
  );

CREATE POLICY "workouts_update_coach" ON public.workouts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
  );

CREATE POLICY "workouts_delete_coach" ON public.workouts
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- WORKOUT_BLOCKS
-- ============================================================================
CREATE POLICY "workout_blocks_select" ON public.workout_blocks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      LEFT JOIN public.coaches c ON w.coach_id = c.id AND c.user_id = auth.uid()
      LEFT JOIN public.workout_assignments wa ON w.id = wa.workout_id AND wa.athlete_id = public.get_my_athlete_id()
      WHERE w.id = workout_id AND (c.id IS NOT NULL OR wa.id IS NOT NULL OR public.is_admin())
    )
  );

CREATE POLICY "workout_blocks_write_coach" ON public.workout_blocks
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      JOIN public.coaches c ON w.coach_id = c.id
      WHERE w.id = workout_id AND c.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- ============================================================================
-- WORKOUT_ASSIGNMENTS
-- ============================================================================
CREATE POLICY "wa_select_athlete_own" ON public.workout_assignments
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_id AND public.coach_manages_athlete(a.id)
    )
    OR public.is_admin()
  );

CREATE POLICY "wa_insert_coach" ON public.workout_assignments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      JOIN public.coaches c ON w.coach_id = c.id
      WHERE w.id = workout_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "wa_update_athlete_status" ON public.workout_assignments
  FOR UPDATE TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
  ) WITH CHECK (
    athlete_id = public.get_my_athlete_id()
  );

CREATE POLICY "wa_update_coach" ON public.workout_assignments
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_id AND public.coach_manages_athlete(a.id)
    )
  );

CREATE POLICY "wa_delete_coach" ON public.workout_assignments
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_id AND public.coach_manages_athlete(a.id)
    ) OR public.is_admin()
  );

-- ============================================================================
-- PLAN_ASSIGNMENTS
-- ============================================================================
CREATE POLICY "pa_select_athlete_own" ON public.plan_assignments
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "pa_write_coach" ON public.plan_assignments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- ACTIVITIES
-- ============================================================================
CREATE POLICY "activities_select_own" ON public.activities
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
  );

CREATE POLICY "activities_select_coach" ON public.activities
  FOR SELECT TO authenticated USING (
    public.coach_manages_athlete(athlete_id)
  );

CREATE POLICY "activities_select_admin" ON public.activities
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "activities_insert_own" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (
    athlete_id = public.get_my_athlete_id()
  );

CREATE POLICY "activities_update_own" ON public.activities
  FOR UPDATE TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
  ) WITH CHECK (
    athlete_id = public.get_my_athlete_id()
  );

CREATE POLICY "activities_delete_own" ON public.activities
  FOR DELETE TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.is_admin()
  );

-- ============================================================================
-- LAPS
-- ============================================================================
CREATE POLICY "laps_select" ON public.laps
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_id AND (
        a.athlete_id = public.get_my_athlete_id()
        OR public.coach_manages_athlete(a.athlete_id)
        OR public.is_admin()
      )
    )
  );

CREATE POLICY "laps_write_own" ON public.laps
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_id AND a.athlete_id = public.get_my_athlete_id()
    )
  );

-- ============================================================================
-- GPS_POINTS
-- ============================================================================
CREATE POLICY "gps_select" ON public.gps_points
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_id AND (
        a.athlete_id = public.get_my_athlete_id()
        OR public.coach_manages_athlete(a.athlete_id)
        OR public.is_admin()
      )
    )
  );

CREATE POLICY "gps_write_own" ON public.gps_points
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_id AND a.athlete_id = public.get_my_athlete_id()
    )
  );

-- ============================================================================
-- GOALS
-- ============================================================================
CREATE POLICY "goals_select_own" ON public.goals
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

CREATE POLICY "goals_write_own" ON public.goals
  FOR ALL TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

-- ============================================================================
-- RACES
-- ============================================================================
CREATE POLICY "races_select_own" ON public.races
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

CREATE POLICY "races_write_own" ON public.races
  FOR ALL TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

-- RACE_MILESTONES
CREATE POLICY "race_milestones_access" ON public.race_milestones
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.races r
      WHERE r.id = race_id AND (
        r.athlete_id = public.get_my_athlete_id()
        OR public.coach_manages_athlete(r.athlete_id)
        OR public.is_admin()
      )
    )
  );

-- ============================================================================
-- ACTIVITY_INBOX
-- ============================================================================
CREATE POLICY "inbox_select_own" ON public.activity_inbox
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

CREATE POLICY "inbox_write_own" ON public.activity_inbox
  FOR ALL TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.is_admin()
  );

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- System can insert notifications (service role bypasses RLS)
CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ============================================================================
-- ACHIEVEMENTS (public catalog)
-- ============================================================================
CREATE POLICY "achievements_select_all" ON public.achievements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "achievements_write_admin" ON public.achievements
  FOR ALL TO authenticated USING (public.is_admin());

-- USER_ACHIEVEMENTS
CREATE POLICY "user_achievements_select" ON public.user_achievements
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

CREATE POLICY "user_achievements_insert" ON public.user_achievements
  FOR INSERT WITH CHECK (athlete_id = public.get_my_athlete_id() OR public.is_admin());

-- ============================================================================
-- COACH_FEEDBACK
-- ============================================================================
CREATE POLICY "feedback_select" ON public.coach_feedback
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "feedback_write_coach" ON public.coach_feedback
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- AUDIT_LOGS (admin only reads, service role writes)
-- ============================================================================
CREATE POLICY "audit_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================================
-- ONBOARDING_DATA
-- ============================================================================
CREATE POLICY "onboarding_own" ON public.onboarding_data
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_admin" ON public.onboarding_data
  FOR ALL TO authenticated USING (public.is_admin());

-- ============================================================================
-- DEVICES & DEVICE_ASSIGNMENTS
-- ============================================================================
CREATE POLICY "devices_select_own_or_coach" ON public.devices
  FOR SELECT TO authenticated USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coaches WHERE user_id = auth.uid() AND id IN (
        SELECT coach_id FROM public.device_assignments WHERE device_id = id
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "devices_write_owner" ON public.devices
  FOR ALL TO authenticated USING (
    owner_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY "da_select_involved" ON public.device_assignments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.athletes WHERE id = athlete_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "da_write_coach" ON public.device_assignments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = coach_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- WORKOUT_ANALYSES
-- ============================================================================
CREATE POLICY "wa_analysis_select" ON public.workout_analyses
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

CREATE POLICY "wa_analysis_write" ON public.workout_analyses
  FOR ALL TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

-- ============================================================================
-- WEEKLY_SUMMARIES
-- ============================================================================
CREATE POLICY "weekly_select" ON public.weekly_summaries
  FOR SELECT TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.coach_manages_athlete(athlete_id)
    OR public.is_admin()
  );

CREATE POLICY "weekly_write" ON public.weekly_summaries
  FOR ALL TO authenticated USING (
    athlete_id = public.get_my_athlete_id()
    OR public.is_admin()
  );
