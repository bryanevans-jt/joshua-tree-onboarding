-- Onboarding links: one row per generated link (state + position).
-- progress is JSONB for draft signatures/uploads (can be large; optional).
create table if not exists public.onboarding_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  state text not null,
  position text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  new_hire_name text,
  progress jsonb
);

create index if not exists idx_onboarding_links_token on public.onboarding_links (token);

-- Single-row app settings (HR email, Comms email, etc.).
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  hr_director_email text not null default '',
  communications_director_email text not null default '',
  from_email text default '',
  company_name text not null default 'Joshua Tree Service Group',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, hr_director_email, communications_director_email, company_name)
values (1, '', '', 'Joshua Tree Service Group')
on conflict (id) do nothing;

-- RLS: use service role for server-side access; no anon access to these tables.
alter table public.onboarding_links enable row level security;
alter table public.app_settings enable row level security;

-- Service role bypasses RLS. No policies needed for server-only access.
-- If you ever need client access, add policies here.
