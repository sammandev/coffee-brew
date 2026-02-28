-- Direct messages Phase 2: 1:1 conversations (group-ready schema), moderation reports, and block list.

alter table public.profiles
  add column if not exists dm_privacy text not null default 'everyone'
  check (dm_privacy in ('everyone', 'verified_only', 'nobody'));

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'direct' check (conversation_type in ('direct', 'group')),
  direct_key text unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  last_message_id uuid null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body_html text not null,
  body_text text not null default '',
  edited_at timestamptz null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dm_conversations_last_message_id_fkey'
  ) then
    alter table public.dm_conversations
      add constraint dm_conversations_last_message_id_fkey
      foreign key (last_message_id)
      references public.dm_messages(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.dm_participants (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz null,
  last_read_at timestamptz null,
  archived_at timestamptz null,
  muted_until timestamptz null,
  primary key (conversation_id, user_id)
);

create table if not exists public.dm_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.dm_messages(id) on delete cascade,
  bucket text not null default 'dm-media',
  storage_path text not null unique,
  public_url text not null,
  mime_type text not null,
  size_bytes integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  message_id uuid not null references public.dm_messages(id) on delete cascade,
  reason text not null,
  detail text null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  assignee_id uuid null references public.profiles(id) on delete set null,
  resolution_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id, blocker_id);
create index if not exists idx_dm_participants_user_archived on public.dm_participants(user_id, archived_at, conversation_id);
create index if not exists idx_dm_messages_conversation_created on public.dm_messages(conversation_id, created_at desc);
create index if not exists idx_dm_reports_status_created on public.dm_reports(status, created_at desc);
create index if not exists idx_dm_conversations_last_message_at on public.dm_conversations(last_message_at desc);

drop trigger if exists trg_dm_conversations_updated_at on public.dm_conversations;
create trigger trg_dm_conversations_updated_at
before update on public.dm_conversations
for each row execute function public.set_updated_at();

drop trigger if exists trg_dm_reports_updated_at on public.dm_reports;
create trigger trg_dm_reports_updated_at
before update on public.dm_reports
for each row execute function public.set_updated_at();

create or replace function public.can_start_dm(sender_id uuid, recipient_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sender_verified boolean;
  recipient_privacy text;
  sender_blocked boolean;
  recipient_blocked boolean;
begin
  if sender_id is null or recipient_id is null or sender_id = recipient_id then
    return false;
  end if;

  select p.is_verified into sender_verified
  from public.profiles p
  where p.id = sender_id;

  select p.dm_privacy into recipient_privacy
  from public.profiles p
  where p.id = recipient_id;

  if recipient_privacy is null then
    return false;
  end if;

  select exists(
    select 1 from public.user_blocks b
    where (b.blocker_id = sender_id and b.blocked_id = recipient_id)
       or (b.blocker_id = recipient_id and b.blocked_id = sender_id)
  ) into sender_blocked;

  if sender_blocked then
    return false;
  end if;

  if recipient_privacy = 'nobody' then
    return false;
  end if;

  if recipient_privacy = 'verified_only' and coalesce(sender_verified, false) = false then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.dm_direct_key(a uuid, b uuid)
returns text
language sql
immutable
as $$
  select case when a::text < b::text then a::text || ':' || b::text else b::text || ':' || a::text end;
$$;

create or replace function public.is_dm_participant(conversation uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.dm_participants p
    where p.conversation_id = conversation
      and p.user_id = viewer
  );
$$;

create or replace function public.dm_last_message_at(conversation uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(m.created_at), now())
  from public.dm_messages m
  where m.conversation_id = conversation;
$$;

alter table public.user_blocks enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_participants enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_message_attachments enable row level security;
alter table public.dm_reports enable row level security;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own" on public.user_blocks
for select using (auth.uid() = blocker_id or auth.uid() = blocked_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own" on public.user_blocks
for insert with check (auth.uid() = blocker_id and public.is_active(auth.uid()));

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own" on public.user_blocks
for delete using (auth.uid() = blocker_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_conversations_select_participant" on public.dm_conversations;
create policy "dm_conversations_select_participant" on public.dm_conversations
for select using (public.is_dm_participant(id, auth.uid()) or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_conversations_insert_active_user" on public.dm_conversations;
create policy "dm_conversations_insert_active_user" on public.dm_conversations
for insert with check (auth.uid() = created_by and public.is_active(auth.uid()));

drop policy if exists "dm_conversations_update_participant" on public.dm_conversations;
create policy "dm_conversations_update_participant" on public.dm_conversations
for update using (public.is_dm_participant(id, auth.uid()) or public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (public.is_dm_participant(id, auth.uid()) or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_participants_select_participant" on public.dm_participants;
create policy "dm_participants_select_participant" on public.dm_participants
for select using (public.is_dm_participant(conversation_id, auth.uid()) or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_participants_insert_by_creator_or_moderator" on public.dm_participants;
create policy "dm_participants_insert_by_creator_or_moderator" on public.dm_participants
for insert with check (
  public.is_active(auth.uid())
  and (
    exists(select 1 from public.dm_conversations c where c.id = conversation_id and c.created_by = auth.uid())
    or public.has_permission(auth.uid(), 'users', 'manage_users')
  )
);

drop policy if exists "dm_participants_update_self_or_moderator" on public.dm_participants;
create policy "dm_participants_update_self_or_moderator" on public.dm_participants
for update using (auth.uid() = user_id or public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (auth.uid() = user_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_messages_select_participant" on public.dm_messages;
create policy "dm_messages_select_participant" on public.dm_messages
for select using (public.is_dm_participant(conversation_id, auth.uid()) or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_messages_insert_participant" on public.dm_messages;
create policy "dm_messages_insert_participant" on public.dm_messages
for insert with check (
  auth.uid() = sender_id
  and public.is_active(auth.uid())
  and public.is_dm_participant(conversation_id, auth.uid())
);

drop policy if exists "dm_messages_update_sender_or_moderator" on public.dm_messages;
create policy "dm_messages_update_sender_or_moderator" on public.dm_messages
for update using (auth.uid() = sender_id or public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (auth.uid() = sender_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_messages_delete_sender_or_moderator" on public.dm_messages;
create policy "dm_messages_delete_sender_or_moderator" on public.dm_messages
for delete using (auth.uid() = sender_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_message_attachments_select_participant" on public.dm_message_attachments;
create policy "dm_message_attachments_select_participant" on public.dm_message_attachments
for select using (
  exists(
    select 1
    from public.dm_messages m
    where m.id = message_id
      and public.is_dm_participant(m.conversation_id, auth.uid())
  )
  or public.has_permission(auth.uid(), 'users', 'manage_users')
);

drop policy if exists "dm_message_attachments_insert_sender" on public.dm_message_attachments;
create policy "dm_message_attachments_insert_sender" on public.dm_message_attachments
for insert with check (
  exists(
    select 1
    from public.dm_messages m
    where m.id = message_id
      and m.sender_id = auth.uid()
  )
);

drop policy if exists "dm_message_attachments_delete_sender_or_moderator" on public.dm_message_attachments;
create policy "dm_message_attachments_delete_sender_or_moderator" on public.dm_message_attachments
for delete using (
  exists(
    select 1
    from public.dm_messages m
    where m.id = message_id
      and m.sender_id = auth.uid()
  )
  or public.has_permission(auth.uid(), 'users', 'manage_users')
);

drop policy if exists "dm_reports_insert_participant" on public.dm_reports;
create policy "dm_reports_insert_participant" on public.dm_reports
for insert with check (
  auth.uid() = reporter_id
  and public.is_dm_participant(conversation_id, auth.uid())
);

drop policy if exists "dm_reports_select_reporter_or_superuser" on public.dm_reports;
create policy "dm_reports_select_reporter_or_superuser" on public.dm_reports
for select using (auth.uid() = reporter_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "dm_reports_update_superuser_only" on public.dm_reports;
create policy "dm_reports_update_superuser_only" on public.dm_reports
for update using (public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (public.has_permission(auth.uid(), 'users', 'manage_users'));

do $$
begin
  alter publication supabase_realtime add table public.dm_conversations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_participants;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_reports;
exception when duplicate_object then null;
end $$;
