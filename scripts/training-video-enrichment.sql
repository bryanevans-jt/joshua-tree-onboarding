-- Run once in Supabase SQL editor (or psql) after pulling latest app code.
-- Adds optional per-video fields used by the training admin + trainee UI.

alter table public.training_videos
  add column if not exists summary text;

alter table public.training_videos
  add column if not exists estimated_minutes integer;
