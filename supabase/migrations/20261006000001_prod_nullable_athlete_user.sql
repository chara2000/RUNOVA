-- ============================================================================
-- RUNOVA — Allow club-managed athletes without auth accounts
-- ============================================================================
-- Problem: athletes.user_id REFERENCES profiles(id) NOT NULL UNIQUE.
-- Coach "add athlete" cannot create a roster row without first creating
-- an auth.users + profiles row (invite flow).
--
-- Solution: make user_id nullable; keep uniqueness only when set
-- (one athlete row per linked profile).
--
-- Follow-up: update public.handle_new_user() ON CONFLICT clause to:
--   ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO NOTHING
-- ============================================================================

ALTER TABLE public.athletes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.athletes
  DROP CONSTRAINT IF EXISTS athletes_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS athletes_user_id_unique
  ON public.athletes (user_id)
  WHERE user_id IS NOT NULL;
