-- Forum platform upgrade: taxonomy, polls, reports, reputation, mentions, media, and drafts.

-- 1) Profiles extension for mentions/reputation/verification
alter table public.profiles
  add column if not exists mention_handle text,
  add column if not exists karma_points integer not null default 0,
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_at timestamptz null;

create or replace function public.slugify_mention_handle(input text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  normalized := lower(coalesce(input, ''));
  normalized := regexp_replace(normalized, '[^a-z0-9]+', '_', 'g');
  normalized := trim(both '_' from normalized);
  if normalized = '' then
    normalized := 'user';
  end if;
  return left(normalized, 24);
end;
$$;

with seeded_handles as (
  select
    p.id,
    public.slugify_mention_handle(coalesce(nullif(p.display_name, ''), split_part(p.email, '@', 1), 'user')) as base_handle
  from public.profiles p
),
ranked_handles as (
  select
    s.id,
    s.base_handle,
    row_number() over (partition by s.base_handle order by s.id) as row_num
  from seeded_handles s
)
update public.profiles p
set mention_handle = case
  when r.row_num = 1 then r.base_handle
  else left(r.base_handle || '_' || r.row_num::text, 32)
end
from ranked_handles r
where p.id = r.id
  and (p.mention_handle is null or p.mention_handle = '');

create unique index if not exists idx_profiles_mention_handle_unique
  on public.profiles(mention_handle)
  where mention_handle is not null;

create index if not exists idx_profiles_karma_points on public.profiles(karma_points desc);

create or replace function public.increment_karma_points(target_user_id uuid, points_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_value integer;
begin
  update public.profiles
  set karma_points = greatest(0, karma_points + coalesce(points_delta, 0))
  where id = target_user_id
  returning karma_points into next_value;
  return coalesce(next_value, 0);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mention_base text;
  mention_candidate text;
  suffix integer := 0;
begin
  mention_base := public.slugify_mention_handle(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'user'
    )
  );
  mention_candidate := mention_base;

  while exists (
    select 1 from public.profiles p
    where p.mention_handle = mention_candidate
      and p.id <> new.id
  ) loop
    suffix := suffix + 1;
    mention_candidate := left(mention_base || '_' || suffix::text, 32);
    if suffix >= 999 then
      mention_candidate := left(mention_base || '_' || replace(substring(new.id::text from 1 for 6), '-', ''), 32);
      exit;
    end if;
  end loop;

  insert into public.profiles(id, email, display_name, mention_handle, status, karma_points, is_verified, verified_at)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    mention_candidate,
    'active',
    0,
    false,
    null
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    mention_handle = coalesce(public.profiles.mention_handle, excluded.mention_handle);

  perform public.assign_default_role(new.id);

  return new;
end;
$$;

-- 2) Taxonomy: categories + subforums
create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_id text not null,
  description_en text,
  description_id text,
  order_index integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_subforums (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories(id) on delete cascade,
  slug text not null unique,
  name_en text not null,
  name_id text not null,
  description_en text,
  description_id text,
  order_index integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forum_categories_visible_order on public.forum_categories(is_visible, order_index);
create index if not exists idx_forum_subforums_category_visible_order on public.forum_subforums(category_id, is_visible, order_index);

drop trigger if exists trg_forum_categories_updated_at on public.forum_categories;
create trigger trg_forum_categories_updated_at
before update on public.forum_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_forum_subforums_updated_at on public.forum_subforums;
create trigger trg_forum_subforums_updated_at
before update on public.forum_subforums
for each row execute function public.set_updated_at();

insert into public.forum_categories (slug, name_en, name_id, description_en, description_id, order_index, is_visible)
values (
  'general',
  'General',
  'Umum',
  'General coffee discussions and questions.',
  'Diskusi dan pertanyaan umum seputar kopi.',
  0,
  true
)
on conflict (slug) do nothing;

insert into public.forum_subforums (category_id, slug, name_en, name_id, description_en, description_id, order_index, is_visible)
select
  c.id,
  'coffee-discussions',
  'Coffee Discussions',
  'Diskusi Kopi',
  'Share brewing workflows, tasting notes, and troubleshooting.',
  'Bagikan alur seduh, catatan rasa, dan pemecahan masalah.',
  0,
  true
from public.forum_categories c
where c.slug = 'general'
on conflict (slug) do nothing;

-- 3) Thread structure upgrades
alter table public.forum_threads
  add column if not exists subforum_id uuid references public.forum_subforums(id) on delete restrict,
  add column if not exists slug text,
  add column if not exists is_locked boolean not null default false,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists deleted_at timestamptz null;

with default_subforum as (
  select id from public.forum_subforums where slug = 'coffee-discussions' limit 1
)
update public.forum_threads t
set subforum_id = ds.id
from default_subforum ds
where t.subforum_id is null;

alter table public.forum_threads
  alter column subforum_id set not null;

update public.forum_threads
set slug = lower(trim(both '-' from regexp_replace(coalesce(title, ''), '[^a-zA-Z0-9]+', '-', 'g')))
where slug is null or slug = '';

create index if not exists idx_forum_threads_subforum_status_updated
  on public.forum_threads(subforum_id, status, is_pinned desc, updated_at desc);
create index if not exists idx_forum_threads_slug on public.forum_threads(slug);
create index if not exists idx_forum_threads_pinned on public.forum_threads(is_pinned desc, updated_at desc);
create index if not exists idx_forum_threads_deleted_at on public.forum_threads(deleted_at);

create index if not exists idx_forum_threads_search
  on public.forum_threads
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));

-- 4) Polls
create table if not exists public.forum_polls (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null unique references public.forum_threads(id) on delete cascade,
  question text not null,
  options jsonb not null,
  closes_at timestamptz null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_polls_options_array check (jsonb_typeof(options) = 'array')
);

create table if not exists public.forum_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.forum_polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index if not exists idx_forum_polls_thread on public.forum_polls(thread_id);
create index if not exists idx_forum_poll_votes_poll on public.forum_poll_votes(poll_id);

drop trigger if exists trg_forum_polls_updated_at on public.forum_polls;
create trigger trg_forum_polls_updated_at
before update on public.forum_polls
for each row execute function public.set_updated_at();

-- 5) Reporting
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'comment', 'reply')),
  target_id uuid not null,
  reason text not null,
  detail text null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  assignee_id uuid null references public.profiles(id) on delete set null,
  resolution_note text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create index if not exists idx_forum_reports_status_created
  on public.forum_reports(status, created_at desc);
create index if not exists idx_forum_reports_target
  on public.forum_reports(target_type, target_id);

drop trigger if exists trg_forum_reports_updated_at on public.forum_reports;
create trigger trg_forum_reports_updated_at
before update on public.forum_reports
for each row execute function public.set_updated_at();

-- 6) Reputation / badges / events
create table if not exists public.badge_definitions (
  id uuid primary key default gen_random_uuid(),
  badge_key text not null unique,
  label_en text not null,
  label_id text not null,
  min_points integer not null default 0,
  color_hex text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badge_definitions(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  awarded_by uuid null references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  primary key(user_id, badge_id)
);

create table if not exists public.forum_reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid null references public.profiles(id) on delete set null,
  event_type text not null,
  points_delta integer not null,
  source_type text null,
  source_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_badge_definitions_points on public.badge_definitions(min_points);
create index if not exists idx_user_badges_user on public.user_badges(user_id, awarded_at desc);
create index if not exists idx_forum_reputation_events_user_created
  on public.forum_reputation_events(user_id, created_at desc);

drop trigger if exists trg_badge_definitions_updated_at on public.badge_definitions;
create trigger trg_badge_definitions_updated_at
before update on public.badge_definitions
for each row execute function public.set_updated_at();

insert into public.badge_definitions (badge_key, label_en, label_id, min_points, color_hex, is_active)
values
  ('starter', 'Starter', 'Pemula', 10, '#7A6A58', true),
  ('contributor', 'Contributor', 'Kontributor', 50, '#1E8A5A', true),
  ('expert', 'Expert', 'Ahli', 150, '#0D6EFD', true),
  ('legend', 'Legend', 'Legenda', 400, '#A24D00', true)
on conflict (badge_key) do nothing;

-- 7) Media assets
create table if not exists public.forum_media_assets (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid null references public.forum_threads(id) on delete cascade,
  comment_id uuid null references public.forum_comments(id) on delete cascade,
  mime_type text not null,
  storage_path text not null unique,
  public_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_forum_media_author on public.forum_media_assets(author_id, created_at desc);
create index if not exists idx_forum_media_thread on public.forum_media_assets(thread_id);
create index if not exists idx_forum_media_comment on public.forum_media_assets(comment_id);

-- 8) Drafts
create table if not exists public.forum_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  draft_type text not null check (draft_type in ('thread', 'comment')),
  subforum_id uuid null references public.forum_subforums(id) on delete cascade,
  thread_id uuid null references public.forum_threads(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forum_drafts_user_type_updated
  on public.forum_drafts(user_id, draft_type, updated_at desc);
create index if not exists idx_forum_drafts_scope
  on public.forum_drafts(user_id, subforum_id, thread_id);

drop trigger if exists trg_forum_drafts_updated_at on public.forum_drafts;
create trigger trg_forum_drafts_updated_at
before update on public.forum_drafts
for each row execute function public.set_updated_at();

-- 9) RLS for new tables and updates
alter table public.forum_categories enable row level security;
alter table public.forum_subforums enable row level security;
alter table public.forum_polls enable row level security;
alter table public.forum_poll_votes enable row level security;
alter table public.forum_reports enable row level security;
alter table public.badge_definitions enable row level security;
alter table public.user_badges enable row level security;
alter table public.forum_reputation_events enable row level security;
alter table public.forum_media_assets enable row level security;
alter table public.forum_drafts enable row level security;

drop policy if exists "forum_categories_public_read" on public.forum_categories;
create policy "forum_categories_public_read" on public.forum_categories
for select using (is_visible = true or public.has_permission(auth.uid(), 'forum', 'read'));

drop policy if exists "forum_categories_moderator_manage" on public.forum_categories;
create policy "forum_categories_moderator_manage" on public.forum_categories
for all
using (public.has_permission(auth.uid(), 'forum', 'moderate'))
with check (public.has_permission(auth.uid(), 'forum', 'moderate'));

drop policy if exists "forum_subforums_public_read" on public.forum_subforums;
create policy "forum_subforums_public_read" on public.forum_subforums
for select using (is_visible = true or public.has_permission(auth.uid(), 'forum', 'read'));

drop policy if exists "forum_subforums_moderator_manage" on public.forum_subforums;
create policy "forum_subforums_moderator_manage" on public.forum_subforums
for all
using (public.has_permission(auth.uid(), 'forum', 'moderate'))
with check (public.has_permission(auth.uid(), 'forum', 'moderate'));

drop policy if exists "forum_polls_public_read" on public.forum_polls;
create policy "forum_polls_public_read" on public.forum_polls
for select using (true);

drop policy if exists "forum_polls_owner_or_moderator_manage" on public.forum_polls;
create policy "forum_polls_owner_or_moderator_manage" on public.forum_polls
for all
using (auth.uid() = created_by or public.has_permission(auth.uid(), 'forum', 'moderate'))
with check (auth.uid() = created_by or public.has_permission(auth.uid(), 'forum', 'moderate'));

drop policy if exists "forum_poll_votes_public_read" on public.forum_poll_votes;
create policy "forum_poll_votes_public_read" on public.forum_poll_votes
for select using (true);

drop policy if exists "forum_poll_votes_insert_own" on public.forum_poll_votes;
create policy "forum_poll_votes_insert_own" on public.forum_poll_votes
for insert with check (auth.uid() = user_id and public.is_active(auth.uid()));

drop policy if exists "forum_poll_votes_delete_own_or_moderator" on public.forum_poll_votes;
create policy "forum_poll_votes_delete_own_or_moderator" on public.forum_poll_votes
for delete using (auth.uid() = user_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

drop policy if exists "forum_reports_insert_own" on public.forum_reports;
create policy "forum_reports_insert_own" on public.forum_reports
for insert with check (auth.uid() = reporter_id and public.is_active(auth.uid()));

drop policy if exists "forum_reports_select_own_or_moderator" on public.forum_reports;
create policy "forum_reports_select_own_or_moderator" on public.forum_reports
for select using (auth.uid() = reporter_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

drop policy if exists "forum_reports_moderator_update" on public.forum_reports;
create policy "forum_reports_moderator_update" on public.forum_reports
for update
using (public.has_permission(auth.uid(), 'forum', 'moderate'))
with check (public.has_permission(auth.uid(), 'forum', 'moderate'));

drop policy if exists "badge_definitions_public_read" on public.badge_definitions;
create policy "badge_definitions_public_read" on public.badge_definitions
for select using (true);

drop policy if exists "badge_definitions_superuser_manage" on public.badge_definitions;
create policy "badge_definitions_superuser_manage" on public.badge_definitions
for all
using (public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "user_badges_public_read" on public.user_badges;
create policy "user_badges_public_read" on public.user_badges
for select using (true);

drop policy if exists "user_badges_superuser_manage" on public.user_badges;
create policy "user_badges_superuser_manage" on public.user_badges
for all
using (public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "forum_reputation_events_select_own_or_admin" on public.forum_reputation_events;
create policy "forum_reputation_events_select_own_or_admin" on public.forum_reputation_events
for select using (auth.uid() = user_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "forum_reputation_events_superuser_insert" on public.forum_reputation_events;
create policy "forum_reputation_events_superuser_insert" on public.forum_reputation_events
for insert with check (public.has_permission(auth.uid(), 'users', 'manage_users'));

drop policy if exists "forum_media_assets_public_read" on public.forum_media_assets;
create policy "forum_media_assets_public_read" on public.forum_media_assets
for select using (true);

drop policy if exists "forum_media_assets_insert_own" on public.forum_media_assets;
create policy "forum_media_assets_insert_own" on public.forum_media_assets
for insert with check (auth.uid() = author_id and public.is_active(auth.uid()));

drop policy if exists "forum_media_assets_delete_own_or_moderator" on public.forum_media_assets;
create policy "forum_media_assets_delete_own_or_moderator" on public.forum_media_assets
for delete using (auth.uid() = author_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

drop policy if exists "forum_drafts_select_own" on public.forum_drafts;
create policy "forum_drafts_select_own" on public.forum_drafts
for select using (auth.uid() = user_id);

drop policy if exists "forum_drafts_insert_own" on public.forum_drafts;
create policy "forum_drafts_insert_own" on public.forum_drafts
for insert with check (auth.uid() = user_id and public.is_active(auth.uid()));

drop policy if exists "forum_drafts_update_own" on public.forum_drafts;
create policy "forum_drafts_update_own" on public.forum_drafts
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "forum_drafts_delete_own" on public.forum_drafts;
create policy "forum_drafts_delete_own" on public.forum_drafts
for delete using (auth.uid() = user_id);

-- 10) Realtime publication for forum live features
do $$
begin
  alter publication supabase_realtime add table public.forum_threads;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.forum_comments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.forum_reactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.forum_drafts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.forum_reports;
exception when duplicate_object then null;
end $$;
