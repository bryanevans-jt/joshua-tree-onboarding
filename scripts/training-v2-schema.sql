-- Training v2 — run once in Supabase SQL editor (clean start for training tables).
-- Destroys legacy training_videos / training_progress rows. Keeps training_modules rows
-- only if you need to preserve module ids; this script DROPS those dependent tables first.
--
-- If you already ran an older v2 script that used training_roster.team_id, run
-- scripts/training-roster-multi-team.sql once to add roster_teams and drop team_id.

-- ---------- Teams ----------
create table if not exists public.training_teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.training_teams (slug, label, sort_order, active)
values
  ('georgia-vocational', 'Georgia Vocational', 10, true),
  ('tennessee-vocational', 'Tennessee Vocational', 11, true),
  ('transition', 'Transition', 20, true),
  ('admin', 'Admin', 30, true),
  ('marketing', 'Marketing', 40, true)
on conflict (slug) do nothing;

-- ---------- Modules (extend) ----------
alter table public.training_modules
  add column if not exists is_company_wide boolean not null default false;
alter table public.training_modules
  add column if not exists team_id uuid references public.training_teams (id) on delete set null;
alter table public.training_modules
  add column if not exists module_sort_order int not null default 0;

-- Legacy video/progress (v1)
drop table if exists public.training_progress cascade;
drop table if exists public.training_videos cascade;

-- ---------- Sections (video / pdf + optional quiz) ----------
create table if not exists public.training_sections (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules (id) on delete cascade,
  order_index int not null,
  kind text not null check (kind in ('video', 'pdf')),
  title text not null,
  youtube_url text,
  pdf_key text,
  quiz_json jsonb,
  content_version int not null default 1,
  summary text,
  estimated_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists training_sections_module_order_idx
  on public.training_sections (module_id, order_index);

-- ---------- Roster & supervisors (multi-team via roster_teams) ----------
create table if not exists public.training_roster (
  email text primary key,
  supervisor_email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.training_roster_teams (
  email text not null references public.training_roster (email) on delete cascade,
  team_id uuid not null references public.training_teams (id) on delete restrict,
  primary key (email, team_id)
);

create index if not exists training_roster_teams_team_idx
  on public.training_roster_teams (team_id);

create table if not exists public.training_supervisors (
  email text primary key,
  created_at timestamptz not null default now()
);

-- ---------- Per-user section progress ----------
create table if not exists public.training_section_progress (
  user_id text not null,
  section_id uuid not null references public.training_sections (id) on delete cascade,
  content_version int not null default 1,
  video_completed_at timestamptz,
  quiz_passed_at timestamptz,
  quiz_attempts int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, section_id)
);

create index if not exists training_section_progress_user_idx
  on public.training_section_progress (user_id);

-- ---------- One-shot full program completion (email sent) ----------
create table if not exists public.training_full_completion (
  user_id text primary key,
  sent_at timestamptz not null default now()
);

-- ---------- Training settings extras ----------
alter table public.training_settings
  add column if not exists communications_contact_name text;
alter table public.training_settings
  add column if not exists communications_contact_email text;
