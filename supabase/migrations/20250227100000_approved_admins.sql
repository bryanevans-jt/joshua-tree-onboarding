-- Approved admin emails (can sign in to /admin). Superadmin is hardcoded in app.
create table if not exists public.approved_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.approved_admins enable row level security;
