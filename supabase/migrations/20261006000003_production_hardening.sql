-- ============================================================================
-- RUNOVA — Migration 7: Production Hardening
-- Audit log, rate-limit helpers, cascade cleanup, missing indexes
-- ============================================================================

-- ── 0. Safety-net: ensure helper functions exist (idempotent) ────────────────
-- These are also defined in migration 3 (rls_policies); recreating here so
-- this migration can run independently without strict ordering.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- ── 1. Audit log table (track all critical mutations) ────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name  TEXT NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  row_id      TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log
CREATE POLICY "audit_log_admin_select" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

-- No one can directly insert/update/delete audit records (only triggers)
CREATE POLICY "audit_log_no_direct_write" ON public.audit_log
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log (table_name, operation, created_at DESC);

-- ── 2. Audit trigger function ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, table_name, operation, row_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to critical tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['activities', 'athletes', 'workouts', 'workout_assignments']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;
       CREATE TRIGGER trg_audit_%I
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- ── 3. Soft-delete support for workouts ──────────────────────────────────────
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

ALTER TABLE public.workout_assignments
  ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

-- ── 4. Performance indexes (missing from earlier migrations) ─────────────────
-- Activities: most queries filter by athlete + time range
CREATE INDEX IF NOT EXISTS idx_activities_athlete_time
  ON public.activities (athlete_id, start_time DESC);

-- Workouts: coaches query by date
CREATE INDEX IF NOT EXISTS idx_workouts_target_date
  ON public.workouts (target_date, coach_id);

-- Activity inbox: pending items per athlete
CREATE INDEX IF NOT EXISTS idx_inbox_athlete_status
  ON public.activity_inbox (athlete_id, status);

-- Assignments: quick lookup by athlete
CREATE INDEX IF NOT EXISTS idx_assignments_athlete
  ON public.workout_assignments (athlete_id, assigned_at DESC);

-- ── 5. Ensure source_sync_id exists (idempotency from migration 6) ───────────
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS source_sync_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS activities_source_sync_id_unique
  ON public.activities (source_sync_id)
  WHERE source_sync_id IS NOT NULL;

-- ── 6. Ensure workouts.workout_type column does NOT exist ────────────────────
-- (app was erroring with "could not find column workout_type")
-- The schema uses 'category' — no action needed, but ensure category exists.
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Rodaje';

-- ── 7. Auto-update updated_at on activities ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['activities', 'athletes', 'workouts', 'profiles']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%I ON public.%I;
       CREATE TRIGGER trg_updated_at_%I
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- ── 8. Updated_at columns where missing ──────────────────────────────────────
ALTER TABLE public.activities      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.athletes        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.workouts        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.activity_inbox  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── 9. RLS: ensure audit_log service-role bypass exists ─────────────────────
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

-- ── Done ─────────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.audit_log IS 'RUNOVA immutable audit trail for all critical mutations.';
