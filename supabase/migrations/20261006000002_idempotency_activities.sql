-- ============================================================================
-- RUNOVA — Idempotency & De-duplication for Activities & Sync
-- ============================================================================

-- 1. Add source_sync_id to activities for idempotent smartwatch/mobile syncs
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS source_sync_id TEXT;

-- 2. Add partial unique index on source_sync_id when present
CREATE UNIQUE INDEX IF NOT EXISTS activities_source_sync_id_unique
  ON public.activities (source_sync_id)
  WHERE source_sync_id IS NOT NULL;

-- 3. Composite index to quickly check if a session with same start_time and athlete already exists
CREATE INDEX IF NOT EXISTS idx_activities_athlete_start_time
  ON public.activities (athlete_id, start_time);
