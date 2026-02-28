-- Brew image metadata support

alter table public.brews
  add column if not exists image_url text,
  add column if not exists image_alt text;
