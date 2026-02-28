-- Coffee Brew initial schema
create extension if not exists "pgcrypto";

create type public.user_status as enum ('active', 'blocked', 'disabled');
create type public.brew_status as enum ('draft', 'published', 'hidden');
create type public.forum_status as enum ('visible', 'hidden');
create type public.reaction_type as enum ('like', 'coffee', 'fire', 'mindblown');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource_key text not null,
  action_key text not null,
  created_at timestamptz not null default now(),
  unique(resource_key, action_key)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, role_id)
);

create table if not exists public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  section_type text not null,
  title text not null,
  subtitle text,
  body text,
  config jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  is_visible boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landing_assets (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.landing_sections(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.brews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  brew_method text not null,
  coffee_beans text not null,
  brand_roastery text not null,
  water_type text not null,
  water_ppm integer not null,
  temperature numeric(5,2) not null,
  temperature_unit text not null default 'C',
  grind_size text not null,
  grind_clicks integer,
  brew_time_seconds integer not null,
  brewer_name text not null,
  notes text,
  status public.brew_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brew_reviews (
  id uuid primary key default gen_random_uuid(),
  brew_id uuid not null references public.brews(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  acidity smallint not null check (acidity between 1 and 5),
  sweetness smallint not null check (sweetness between 1 and 5),
  body smallint not null check (body between 1 and 5),
  aroma smallint not null check (aroma between 1 and 5),
  balance smallint not null check (balance between 1 and 5),
  overall numeric(3,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(brew_id, reviewer_id)
);

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  status public.forum_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  status public.forum_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid references public.forum_threads(id) on delete cascade,
  comment_id uuid references public.forum_comments(id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'comment')),
  target_id uuid not null,
  reaction public.reaction_type not null,
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id, reaction)
);

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null unique,
  consent boolean not null default false,
  source text,
  provider text,
  provider_subscriber_id text,
  sync_status text not null default 'queued',
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactional_email_events (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  provider_message_id text,
  delivery_status text not null default 'queued',
  failure_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.deleted_users_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  display_name text,
  previous_status public.user_status,
  deleted_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_landing_sections_order on public.landing_sections(order_index);
create index if not exists idx_brews_owner on public.brews(owner_id);
create index if not exists idx_brews_status on public.brews(status);
create index if not exists idx_forum_threads_status on public.forum_threads(status);
create index if not exists idx_forum_comments_thread on public.forum_comments(thread_id);
create index if not exists idx_brew_reviews_brew on public.brew_reviews(brew_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_landing_sections_updated_at before update on public.landing_sections for each row execute function public.set_updated_at();
create trigger trg_brews_updated_at before update on public.brews for each row execute function public.set_updated_at();
create trigger trg_brew_reviews_updated_at before update on public.brew_reviews for each row execute function public.set_updated_at();
create trigger trg_forum_threads_updated_at before update on public.forum_threads for each row execute function public.set_updated_at();
create trigger trg_forum_comments_updated_at before update on public.forum_comments for each row execute function public.set_updated_at();
create trigger trg_newsletter_updated_at before update on public.newsletter_subscriptions for each row execute function public.set_updated_at();

insert into public.roles(name)
values ('user'), ('admin'), ('superuser')
on conflict (name) do nothing;

insert into public.permissions(resource_key, action_key)
values
  ('landing', 'create'),
  ('landing', 'read'),
  ('landing', 'update'),
  ('landing', 'delete'),
  ('brews', 'create'),
  ('brews', 'read'),
  ('brews', 'update'),
  ('brews', 'delete'),
  ('brews', 'moderate'),
  ('catalog', 'read'),
  ('forum', 'create'),
  ('forum', 'read'),
  ('forum', 'update'),
  ('forum', 'delete'),
  ('forum', 'moderate'),
  ('reviews', 'create'),
  ('reviews', 'read'),
  ('reviews', 'update'),
  ('users', 'manage_users'),
  ('rbac', 'manage_permissions')
on conflict (resource_key, action_key) do nothing;

create or replace function public.assign_default_role(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role_id uuid;
begin
  select id into user_role_id from public.roles where name = 'user';
  if user_role_id is null then
    raise exception 'Default role not found';
  end if;

  insert into public.user_roles(user_id, role_id)
  values (target_user_id, user_role_id)
  on conflict do nothing;
end;
$$;

create or replace function public.promote_user_to_role(target_email text, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_user_id uuid;
  selected_role_id uuid;
begin
  select p.id into selected_user_id
  from public.profiles p
  where lower(p.email) = lower(target_email)
  limit 1;

  if selected_user_id is null then
    raise exception 'Profile for email % not found', target_email;
  end if;

  select r.id into selected_role_id
  from public.roles r
  where r.name = target_role
  limit 1;

  if selected_role_id is null then
    raise exception 'Role % not found', target_role;
  end if;

  delete from public.user_roles where user_id = selected_user_id;
  insert into public.user_roles(user_id, role_id) values (selected_user_id, selected_role_id);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, email, display_name, status)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name);

  perform public.assign_default_role(new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.user_role(user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.name
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = user_role.user_id
  order by case r.name when 'superuser' then 1 when 'admin' then 2 else 3 end
  limit 1;
$$;

create or replace function public.is_active(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = is_active.user_id
      and p.status = 'active'
  );
$$;

create or replace function public.has_permission(user_id uuid, resource text, action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = has_permission.user_id
      and p.resource_key = has_permission.resource
      and p.action_key = has_permission.action
  );
$$;

-- Default role permissions
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on (
    (r.name = 'user' and (
      (p.resource_key = 'brews' and p.action_key in ('create','read','update','delete')) or
      (p.resource_key = 'catalog' and p.action_key = 'read') or
      (p.resource_key = 'forum' and p.action_key in ('create','read','update','delete')) or
      (p.resource_key = 'reviews' and p.action_key in ('create','read','update'))
    ))
    or
    (r.name = 'admin' and (
      (p.resource_key = 'landing' and p.action_key in ('create','read','update','delete')) or
      (p.resource_key = 'brews' and p.action_key in ('read','moderate')) or
      (p.resource_key = 'catalog' and p.action_key = 'read') or
      (p.resource_key = 'forum' and p.action_key in ('read','moderate')) or
      (p.resource_key = 'reviews' and p.action_key = 'read')
    ))
    or
    (r.name = 'superuser')
  )
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.landing_sections enable row level security;
alter table public.landing_assets enable row level security;
alter table public.brews enable row level security;
alter table public.brew_reviews enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_reactions enable row level security;
alter table public.moderation_events enable row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table public.transactional_email_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.deleted_users_archive enable row level security;

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles
for select
using (
  auth.uid() = id
  or public.has_permission(auth.uid(), 'users', 'manage_users')
);

create policy "profiles_insert_own" on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_admin_manage" on public.profiles
for all
using (public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (public.has_permission(auth.uid(), 'users', 'manage_users'));

-- roles, permissions, role_permissions, user_roles
create policy "roles_read_all_auth" on public.roles
for select using (auth.uid() is not null);
create policy "permissions_read_all_auth" on public.permissions
for select using (auth.uid() is not null);
create policy "role_permissions_read_all_auth" on public.role_permissions
for select using (auth.uid() is not null);
create policy "user_roles_read_own_or_admin" on public.user_roles
for select
using (auth.uid() = user_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

create policy "rbac_superuser_manage_roles" on public.roles
for all
using (public.has_permission(auth.uid(), 'rbac', 'manage_permissions'))
with check (public.has_permission(auth.uid(), 'rbac', 'manage_permissions'));

create policy "rbac_superuser_manage_permissions" on public.permissions
for all
using (public.has_permission(auth.uid(), 'rbac', 'manage_permissions'))
with check (public.has_permission(auth.uid(), 'rbac', 'manage_permissions'));

create policy "rbac_superuser_manage_role_permissions" on public.role_permissions
for all
using (public.has_permission(auth.uid(), 'rbac', 'manage_permissions'))
with check (public.has_permission(auth.uid(), 'rbac', 'manage_permissions'));

create policy "rbac_superuser_manage_user_roles" on public.user_roles
for all
using (public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (public.has_permission(auth.uid(), 'users', 'manage_users'));

-- landing
create policy "landing_public_read_visible" on public.landing_sections
for select
using (is_visible = true or public.has_permission(auth.uid(), 'landing', 'read'));

create policy "landing_admin_manage" on public.landing_sections
for all
using (public.has_permission(auth.uid(), 'landing', 'update'))
with check (public.has_permission(auth.uid(), 'landing', 'update'));

create policy "landing_assets_public_read" on public.landing_assets
for select using (true);

create policy "landing_assets_admin_manage" on public.landing_assets
for all
using (public.has_permission(auth.uid(), 'landing', 'update'))
with check (public.has_permission(auth.uid(), 'landing', 'update'));

-- brews
create policy "brews_public_read_published" on public.brews
for select
using (
  status = 'published'
  or auth.uid() = owner_id
  or public.has_permission(auth.uid(), 'brews', 'read')
);

create policy "brews_owner_insert" on public.brews
for insert
with check (auth.uid() = owner_id and public.is_active(auth.uid()));

create policy "brews_owner_update_or_moderator" on public.brews
for update
using (auth.uid() = owner_id or public.has_permission(auth.uid(), 'brews', 'moderate'))
with check (auth.uid() = owner_id or public.has_permission(auth.uid(), 'brews', 'moderate'));

create policy "brews_owner_delete_or_moderator" on public.brews
for delete
using (auth.uid() = owner_id or public.has_permission(auth.uid(), 'brews', 'moderate'));

-- reviews
create policy "reviews_public_read" on public.brew_reviews
for select using (true);

create policy "reviews_owner_upsert" on public.brew_reviews
for insert
with check (auth.uid() = reviewer_id and public.is_active(auth.uid()));

create policy "reviews_owner_update" on public.brew_reviews
for update
using (auth.uid() = reviewer_id)
with check (auth.uid() = reviewer_id);

create policy "reviews_owner_delete" on public.brew_reviews
for delete
using (auth.uid() = reviewer_id or public.has_permission(auth.uid(), 'reviews', 'delete'));

-- forum
create policy "forum_threads_public_read_visible" on public.forum_threads
for select
using (status = 'visible' or public.has_permission(auth.uid(), 'forum', 'moderate'));

create policy "forum_threads_insert_active_user" on public.forum_threads
for insert
with check (auth.uid() = author_id and public.is_active(auth.uid()));

create policy "forum_threads_update_owner_or_moderator" on public.forum_threads
for update
using (auth.uid() = author_id or public.has_permission(auth.uid(), 'forum', 'moderate'))
with check (auth.uid() = author_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

create policy "forum_threads_delete_owner_or_moderator" on public.forum_threads
for delete
using (auth.uid() = author_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

create policy "forum_comments_public_read_visible" on public.forum_comments
for select
using (status = 'visible' or public.has_permission(auth.uid(), 'forum', 'moderate'));

create policy "forum_comments_insert_active_user" on public.forum_comments
for insert
with check (auth.uid() = author_id and public.is_active(auth.uid()));

create policy "forum_comments_update_owner_or_moderator" on public.forum_comments
for update
using (auth.uid() = author_id or public.has_permission(auth.uid(), 'forum', 'moderate'))
with check (auth.uid() = author_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

create policy "forum_comments_delete_owner_or_moderator" on public.forum_comments
for delete
using (auth.uid() = author_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

create policy "forum_reactions_public_read" on public.forum_reactions
for select using (true);

create policy "forum_reactions_insert_own" on public.forum_reactions
for insert
with check (auth.uid() = user_id and public.is_active(auth.uid()));

create policy "forum_reactions_delete_own_or_moderator" on public.forum_reactions
for delete
using (auth.uid() = user_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

-- moderation/audit/newsletter/email
create policy "moderation_admin_read" on public.moderation_events
for select
using (public.has_permission(auth.uid(), 'forum', 'moderate') or public.has_permission(auth.uid(), 'brews', 'moderate'));

create policy "moderation_admin_insert" on public.moderation_events
for insert
with check (public.has_permission(auth.uid(), 'forum', 'moderate') or public.has_permission(auth.uid(), 'brews', 'moderate'));

create policy "newsletter_self_or_admin" on public.newsletter_subscriptions
for all
using (
  auth.uid() = user_id
  or lower(email) = lower((select email from auth.users where id = auth.uid()))
  or public.has_permission(auth.uid(), 'users', 'manage_users')
)
with check (
  auth.uid() = user_id
  or lower(email) = lower((select email from auth.users where id = auth.uid()))
  or public.has_permission(auth.uid(), 'users', 'manage_users')
);

create policy "transactional_email_admin_read" on public.transactional_email_events
for select using (public.has_permission(auth.uid(), 'users', 'manage_users'));

create policy "transactional_email_admin_insert" on public.transactional_email_events
for insert with check (public.has_permission(auth.uid(), 'users', 'manage_users'));

create policy "audit_log_admin_read" on public.audit_logs
for select using (public.has_permission(auth.uid(), 'users', 'manage_users'));

create policy "audit_log_self_insert" on public.audit_logs
for insert with check (auth.uid() = actor_id or public.has_permission(auth.uid(), 'users', 'manage_users'));

create policy "deleted_user_archive_superuser" on public.deleted_users_archive
for all
using (public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (public.has_permission(auth.uid(), 'users', 'manage_users'));
