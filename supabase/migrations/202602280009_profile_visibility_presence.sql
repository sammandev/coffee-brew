alter table public.profiles
  add column if not exists is_profile_private boolean not null default false,
  add column if not exists show_online_status boolean not null default true,
  add column if not exists last_active_at timestamptz not null default now();

create index if not exists idx_profiles_last_active_at on public.profiles(last_active_at desc);
