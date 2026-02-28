create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('review', 'comment', 'reply', 'reaction')),
  title text not null,
  body text not null,
  link_path text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_recipient_read_created
  on public.user_notifications(recipient_id, read_at, created_at desc);

create index if not exists idx_user_notifications_recipient_created
  on public.user_notifications(recipient_id, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own" on public.user_notifications
for select
using (auth.uid() = recipient_id);

drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own" on public.user_notifications
for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

do $$
begin
  alter publication supabase_realtime add table public.user_notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;
