-- Brew experience upgrade: recommendations, grind reference, wishlist, and share tokens.

alter table public.brews
  add column if not exists bean_process text,
  add column if not exists recommended_methods text[] not null default '{}'::text[],
  add column if not exists grind_reference_image_url text,
  add column if not exists grind_reference_image_alt text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'brews_recommended_methods_allowed'
  ) then
    alter table public.brews
      add constraint brews_recommended_methods_allowed
      check (recommended_methods <@ array['espresso','cold_brew','pour_over']::text[]);
  end if;
end $$;

create table if not exists public.brew_wishlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  brew_id uuid not null references public.brews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, brew_id)
);

create table if not exists public.brew_collection_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brews_recommended_methods on public.brews using gin(recommended_methods);
create index if not exists idx_brew_wishlist_user_created on public.brew_wishlist(user_id, created_at desc);
create index if not exists idx_brew_wishlist_brew on public.brew_wishlist(brew_id);
create index if not exists idx_brew_collection_shares_token on public.brew_collection_shares(token);

drop trigger if exists trg_brew_collection_shares_updated_at on public.brew_collection_shares;
create trigger trg_brew_collection_shares_updated_at
before update on public.brew_collection_shares
for each row execute function public.set_updated_at();

alter table public.brew_wishlist enable row level security;
alter table public.brew_collection_shares enable row level security;

drop policy if exists "brew_wishlist_select_own" on public.brew_wishlist;
create policy "brew_wishlist_select_own" on public.brew_wishlist
for select using (auth.uid() = user_id);

drop policy if exists "brew_wishlist_insert_own" on public.brew_wishlist;
create policy "brew_wishlist_insert_own" on public.brew_wishlist
for insert with check (auth.uid() = user_id and public.is_active(auth.uid()));

drop policy if exists "brew_wishlist_delete_own" on public.brew_wishlist;
create policy "brew_wishlist_delete_own" on public.brew_wishlist
for delete using (auth.uid() = user_id);

drop policy if exists "brew_collection_shares_select_own" on public.brew_collection_shares;
create policy "brew_collection_shares_select_own" on public.brew_collection_shares
for select using (auth.uid() = owner_id);

drop policy if exists "brew_collection_shares_insert_own" on public.brew_collection_shares;
create policy "brew_collection_shares_insert_own" on public.brew_collection_shares
for insert with check (auth.uid() = owner_id and public.is_active(auth.uid()));

drop policy if exists "brew_collection_shares_update_own" on public.brew_collection_shares;
create policy "brew_collection_shares_update_own" on public.brew_collection_shares
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "brew_collection_shares_delete_own" on public.brew_collection_shares;
create policy "brew_collection_shares_delete_own" on public.brew_collection_shares
for delete using (auth.uid() = owner_id);
