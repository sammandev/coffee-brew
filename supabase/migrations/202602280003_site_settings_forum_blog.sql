-- Site settings, forum nesting/tags, and blog CMS

create table if not exists public.site_settings (
  id boolean primary key default true check (id = true),
  app_name text not null default 'Coffee Brew',
  tab_title text not null default 'Coffee Brew',
  home_title_en text,
  home_title_id text,
  home_subtitle_en text,
  home_subtitle_id text,
  navbar_links jsonb not null default '[]'::jsonb,
  footer_tagline_en text not null default 'Brew better coffee with recipes, notes, and community feedback.',
  footer_tagline_id text not null default 'Seduh kopi lebih baik dengan resep, catatan, dan umpan balik komunitas.',
  footer_description_en text not null default 'Track your brews, publish discoveries, and improve one cup at a time.',
  footer_description_id text not null default 'Catat racikanmu, publikasikan temuanmu, dan tingkatkan tiap cangkir.',
  footer_links jsonb not null default '[]'::jsonb,
  enable_google_login boolean not null default true,
  enable_magic_link_login boolean not null default true,
  enable_signup boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (
  id,
  navbar_links,
  footer_links
)
values (
  true,
  '[
    {"href":"/","label_en":"Home","label_id":"Beranda","is_visible":true},
    {"href":"/catalog","label_en":"Catalog","label_id":"Katalog","is_visible":true},
    {"href":"/forum","label_en":"Forum","label_id":"Forum","is_visible":true},
    {"href":"/blog","label_en":"Blog","label_id":"Blog","is_visible":true},
    {"href":"/about","label_en":"About","label_id":"Tentang","is_visible":true},
    {"href":"/contact","label_en":"Contact","label_id":"Kontak","is_visible":true}
  ]'::jsonb,
  '[
    {"group":"sitemap","href":"/","label_en":"Home","label_id":"Beranda","is_visible":true},
    {"group":"sitemap","href":"/sitemap","label_en":"Sitemap","label_id":"Peta Situs","is_visible":true},
    {"group":"community","href":"/catalog","label_en":"Catalog","label_id":"Katalog","is_visible":true},
    {"group":"community","href":"/forum","label_en":"Forum","label_id":"Forum","is_visible":true},
    {"group":"community","href":"/blog","label_en":"Blog","label_id":"Blog","is_visible":true},
    {"group":"support","href":"/contact","label_en":"Contact","label_id":"Kontak","is_visible":true},
    {"group":"support","href":"/about","label_en":"About","label_id":"Tentang","is_visible":true}
  ]'::jsonb
)
on conflict (id) do nothing;

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings
for select
using (true);

drop policy if exists "site_settings_superuser_manage" on public.site_settings;
create policy "site_settings_superuser_manage" on public.site_settings
for all
using (public.has_permission(auth.uid(), 'users', 'manage_users'))
with check (public.has_permission(auth.uid(), 'users', 'manage_users'));

alter table public.forum_threads
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.forum_comments
  add column if not exists parent_comment_id uuid references public.forum_comments(id) on delete cascade;

create index if not exists idx_forum_threads_tags on public.forum_threads using gin(tags);
create index if not exists idx_forum_comments_parent on public.forum_comments(parent_comment_id);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_id text not null,
  excerpt_en text not null,
  excerpt_id text not null,
  body_en text not null,
  body_id text not null,
  hero_image_url text not null,
  hero_image_alt_en text not null default 'Coffee blog hero image',
  hero_image_alt_id text not null default 'Gambar utama blog kopi',
  tags text[] not null default '{}'::text[],
  reading_time_minutes integer not null default 3,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  author_id uuid references public.profiles(id) on delete set null,
  editor_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blog_posts_status on public.blog_posts(status);
create index if not exists idx_blog_posts_published_at on public.blog_posts(published_at desc);
create index if not exists idx_blog_posts_tags on public.blog_posts using gin(tags);

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read" on public.blog_posts
for select
using (
  status = 'published'
  or public.has_permission(auth.uid(), 'landing', 'read')
);

drop policy if exists "blog_posts_admin_manage" on public.blog_posts;
create policy "blog_posts_admin_manage" on public.blog_posts
for all
using (public.has_permission(auth.uid(), 'landing', 'update'))
with check (public.has_permission(auth.uid(), 'landing', 'update'));

insert into public.blog_posts (
  slug,
  title_en,
  title_id,
  excerpt_en,
  excerpt_id,
  body_en,
  body_id,
  hero_image_url,
  hero_image_alt_en,
  hero_image_alt_id,
  tags,
  reading_time_minutes,
  status,
  published_at
)
values
  (
    'dialing-in-pour-over-at-home',
    'Dialing In Pour Over at Home',
    'Menyetel Pour Over di Rumah',
    'A practical workflow to tune grind size, water ratio, and extraction time for cleaner cups.',
    'Alur praktis untuk menyetel ukuran giling, rasio air, dan waktu ekstraksi agar cangkir lebih bersih.',
    'Start by fixing one variable at a time. Keep your brew ratio stable for several attempts before changing temperature or grind settings.\n\nIf your cup tastes sour and thin, grind slightly finer or extend brew time. If it tastes bitter and dry, coarsen the grind or lower extraction time.\n\nLog every brew in Coffee Brew so you can compare outcomes week by week instead of relying on memory.',
    'Mulailah dengan mengunci satu variabel setiap kali. Pertahankan rasio seduh untuk beberapa percobaan sebelum mengubah suhu atau gilingan.\n\nJika cangkir terasa asam dan tipis, giling sedikit lebih halus atau perpanjang waktu seduh. Jika pahit dan kering, buat gilingan lebih kasar atau kurangi waktu ekstraksi.\n\nCatat setiap seduhan di Coffee Brew agar kamu bisa membandingkan hasil dari minggu ke minggu tanpa bergantung pada ingatan.',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1400&q=80',
    'Pour over coffee setup',
    'Peralatan pour over kopi',
    array['pour-over','home-brewing'],
    5,
    'published',
    now() - interval '8 days'
  ),
  (
    'water-chemistry-for-daily-brewing',
    'Water Chemistry for Daily Brewing',
    'Kimia Air untuk Seduhan Harian',
    'Why water ppm and mineral balance can change sweetness, body, and clarity in your brew.',
    'Mengapa ppm air dan keseimbangan mineral bisa mengubah sweetness, body, dan clarity pada seduhan.',
    'Coffee is mostly water, so small differences in mineral content can dramatically affect extraction and flavor perception.\n\nTest two water profiles with the same beans and recipe. Record acidity, sweetness, and body scores for direct comparison.\n\nA stable water source is one of the fastest ways to make brew quality consistent every day.',
    'Kopi sebagian besar terdiri dari air, jadi perbedaan kecil kandungan mineral bisa sangat memengaruhi ekstraksi dan persepsi rasa.\n\nUji dua profil air dengan biji dan resep yang sama. Catat skor acidity, sweetness, dan body untuk perbandingan langsung.\n\nSumber air yang stabil adalah salah satu cara tercepat untuk membuat kualitas seduhan konsisten setiap hari.',
    'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1400&q=80',
    'Fresh coffee beans and cup',
    'Biji kopi segar dan cangkir',
    array['water','extraction'],
    4,
    'published',
    now() - interval '3 days'
  )
on conflict (slug) do nothing;
