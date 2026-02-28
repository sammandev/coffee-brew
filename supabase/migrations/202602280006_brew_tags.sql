-- Brew tags support

alter table public.brews
  add column if not exists tags text[] not null default '{}'::text[];
