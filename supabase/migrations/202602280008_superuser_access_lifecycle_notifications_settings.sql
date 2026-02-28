-- Superuser access hardening + lifecycle statuses + notification archive + tab icon settings

create or replace function public.has_permission(user_id uuid, resource text, action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when public.user_role(has_permission.user_id) = 'superuser' then true
      else exists (
        select 1
        from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
        where ur.user_id = has_permission.user_id
          and p.resource_key = has_permission.resource
          and p.action_key = has_permission.action
      )
    end;
$$;

alter table public.faq_items
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'published', 'hidden'));

update public.faq_items
set status = case when is_visible then 'published' else 'hidden' end
where status = 'draft';

create index if not exists idx_faq_items_status on public.faq_items(status);

alter table public.landing_sections
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'published', 'hidden'));

update public.landing_sections
set status = case when is_visible then 'published' else 'hidden' end
where status = 'draft';

create index if not exists idx_landing_sections_status on public.landing_sections(status);

drop policy if exists "faq_public_read_visible" on public.faq_items;
create policy "faq_public_read_visible" on public.faq_items
for select
using (status = 'published' or public.has_permission(auth.uid(), 'landing', 'read'));

drop policy if exists "landing_public_read_visible" on public.landing_sections;
create policy "landing_public_read_visible" on public.landing_sections
for select
using (status = 'published' or public.has_permission(auth.uid(), 'landing', 'read'));

alter table public.site_settings
  add column if not exists tab_icon_url text,
  add column if not exists tab_icon_storage_path text;

alter table if exists public.user_notifications
  add column if not exists archived_at timestamptz;

drop policy if exists "user_notifications_delete_own" on public.user_notifications;
create policy "user_notifications_delete_own" on public.user_notifications
for delete
using (auth.uid() = recipient_id);
