-- Run in Supabase SQL after deploying app code that expects multi-team roster.
-- 1) Many-to-many: employees can belong to multiple teams (e.g. GA + TN vocational).
-- 2) Adds Georgia / Tennessee vocational teams and retires the single "Vocational" bucket.

-- Junction table (person ↔ teams)
CREATE TABLE IF NOT EXISTS public.training_roster_teams (
  email text NOT NULL REFERENCES public.training_roster (email) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.training_teams (id) ON DELETE RESTRICT,
  PRIMARY KEY (email, team_id)
);

CREATE INDEX IF NOT EXISTS training_roster_teams_team_idx
  ON public.training_roster_teams (team_id);

-- Backfill from legacy team_id column, then drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'training_roster'
      AND column_name = 'team_id'
  ) THEN
    INSERT INTO public.training_roster_teams (email, team_id)
    SELECT email, team_id FROM public.training_roster
    ON CONFLICT (email, team_id) DO NOTHING;

    ALTER TABLE public.training_roster DROP COLUMN team_id;
  END IF;
END $$;

-- Split vocational: new state teams (assign people in roster UI); retire generic slug
INSERT INTO public.training_teams (slug, label, sort_order, active)
VALUES
  ('georgia-vocational', 'Georgia Vocational', 11, true),
  ('tennessee-vocational', 'Tennessee Vocational', 12, true)
ON CONFLICT (slug) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    active = true;

UPDATE public.training_teams
SET active = false
WHERE slug = 'vocational';

-- Anyone still linked to legacy "vocational" is moved to Georgia Vocational (run after teams exist).
UPDATE public.training_roster_teams rt
SET team_id = (SELECT id FROM public.training_teams WHERE slug = 'georgia-vocational' LIMIT 1)
WHERE team_id = (SELECT id FROM public.training_teams WHERE slug = 'vocational' LIMIT 1);
