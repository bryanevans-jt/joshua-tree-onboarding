-- Optional training sections (excluded from completion requirements).
-- Run once in Supabase SQL editor.

alter table public.training_sections
  add column if not exists is_optional boolean not null default false;
