-- State-specific onboarding positions (job descriptions per position).
-- Run once in Supabase SQL editor.

create table if not exists public.onboarding_positions (
  id uuid primary key default gen_random_uuid(),
  state text not null check (state in ('Georgia', 'Tennessee')),
  label text not null,
  slug text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (state, slug)
);

create index if not exists onboarding_positions_state_active_idx
  on public.onboarding_positions (state, active, sort_order);

-- Seed current positions for both states (matches legacy config.ts list).
insert into public.onboarding_positions (state, label, slug, sort_order, active)
values
  ('Georgia', 'Employment Specialist', 'employment_specialist', 10, true),
  ('Georgia', 'Transition Instructor', 'transition_instructor', 20, true),
  ('Georgia', 'Vocational Supervisor', 'vocational_supervisor', 30, true),
  ('Georgia', 'Transition Supervisor', 'transition_supervisor', 40, true),
  ('Georgia', 'Community Relations Specialist', 'community_relations_specialist', 50, true),
  ('Tennessee', 'Employment Specialist', 'employment_specialist', 10, true),
  ('Tennessee', 'Transition Instructor', 'transition_instructor', 20, true),
  ('Tennessee', 'Vocational Supervisor', 'vocational_supervisor', 30, true),
  ('Tennessee', 'Transition Supervisor', 'transition_supervisor', 40, true),
  ('Tennessee', 'Community Relations Specialist', 'community_relations_specialist', 50, true)
on conflict (state, slug) do nothing;
