-- Content localization and FAQ CMS
alter table public.landing_sections
  add column if not exists title_id text,
  add column if not exists subtitle_id text,
  add column if not exists body_id text,
  add column if not exists config_id jsonb not null default '{}'::jsonb;

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question_en text not null,
  answer_en text not null,
  question_id text not null,
  answer_id text not null,
  order_index integer not null default 0,
  is_visible boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faq_items_order on public.faq_items(order_index);

drop trigger if exists trg_faq_items_updated_at on public.faq_items;
create trigger trg_faq_items_updated_at
before update on public.faq_items
for each row execute function public.set_updated_at();

alter table public.faq_items enable row level security;

drop policy if exists "faq_public_read_visible" on public.faq_items;
create policy "faq_public_read_visible" on public.faq_items
for select
using (is_visible = true or public.has_permission(auth.uid(), 'landing', 'read'));

drop policy if exists "faq_admin_manage" on public.faq_items;
create policy "faq_admin_manage" on public.faq_items
for all
using (public.has_permission(auth.uid(), 'landing', 'update'))
with check (public.has_permission(auth.uid(), 'landing', 'update'));
