-- Optional: run after creating a real auth user
-- select public.promote_user_to_role('you@example.com', 'superuser');

insert into public.landing_sections (
  section_type,
  title,
  title_id,
  subtitle,
  subtitle_id,
  body,
  body_id,
  config,
  config_id,
  order_index,
  is_visible
)
select
  'hero',
  'Brew Better Coffee Every Morning',
  'Seduh Kopi Lebih Baik Setiap Pagi',
  'Track recipes, compare notes, and improve your cup with data-backed brewing.',
  'Catat resep, bandingkan catatan, dan tingkatkan cangkir kopimu dengan data.',
  null,
  null,
  jsonb_build_object(
    'ctaText', 'Explore Catalog',
    'ctaLink', '/catalog',
    'assetUrl', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80',
    'assetAlt', 'Coffee cups on a wooden table'
  ),
  jsonb_build_object(
    'ctaText', 'Lihat Katalog',
    'ctaLink', '/catalog',
    'assetUrl', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80',
    'assetAlt', 'Cangkir kopi di atas meja kayu'
  ),
  0,
  true
where not exists (
  select 1 from public.landing_sections where title = 'Brew Better Coffee Every Morning'
);

insert into public.landing_sections (
  section_type,
  title,
  title_id,
  subtitle,
  subtitle_id,
  body,
  body_id,
  config,
  config_id,
  order_index,
  is_visible
)
select
  'feature_grid',
  'Precision Tools for Every Cup',
  'Alat Presisi untuk Setiap Cangkir',
  'From water chemistry to grinder click data.',
  'Dari kimia air hingga data klik grinder.',
  'Log your variables, publish winning brews, and learn from a live coffee community.',
  'Catat variabelmu, publikasikan racikan terbaik, dan belajar dari komunitas kopi aktif.',
  jsonb_build_object(
    'ctaText', 'Create Brew',
    'ctaLink', '/dashboard/brews/new',
    'assetUrl', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1400&q=80',
    'assetAlt', 'Espresso being prepared'
  ),
  jsonb_build_object(
    'ctaText', 'Buat Racikan',
    'ctaLink', '/dashboard/brews/new',
    'assetUrl', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1400&q=80',
    'assetAlt', 'Proses pembuatan espresso'
  ),
  1,
  true
where not exists (
  select 1 from public.landing_sections where title = 'Precision Tools for Every Cup'
);

insert into public.landing_sections (
  section_type,
  title,
  title_id,
  subtitle,
  subtitle_id,
  body,
  body_id,
  config,
  config_id,
  order_index,
  is_visible
)
select
  'stats',
  'Community Brewing Momentum',
  'Pertumbuhan Komunitas Seduh',
  null,
  null,
  null,
  null,
  jsonb_build_object(
    'items',
    jsonb_build_array(
      jsonb_build_object('label', 'Shared Brew Recipes', 'label_id', 'Resep Racikan Dibagikan', 'value', '1,250+'),
      jsonb_build_object('label', 'Forum Discussions', 'label_id', 'Diskusi Forum', 'value', '340+'),
      jsonb_build_object('label', 'Average Rating Entries', 'label_id', 'Total Entri Rating', 'value', '5.0k+'),
      jsonb_build_object('label', 'Roasteries Tracked', 'label_id', 'Roastery Tercatat', 'value', '120+')
    )
  ),
  '{}'::jsonb,
  2,
  true
where not exists (
  select 1 from public.landing_sections where title = 'Community Brewing Momentum'
);

insert into public.landing_sections (
  section_type,
  title,
  title_id,
  subtitle,
  subtitle_id,
  body,
  body_id,
  config,
  config_id,
  order_index,
  is_visible
)
select
  'testimonial',
  'From Home Brewers to Professionals',
  'Dari Home Brewer hingga Profesional',
  'Thousands improve their daily cup with shared data and feedback.',
  'Ribuan orang meningkatkan cangkir harian dengan data dan umpan balik.',
  'Use Coffee Brew to compare brew variables, run mini experiments, and keep your best recipes organized.',
  'Gunakan Coffee Brew untuk membandingkan variabel seduh, menjalankan eksperimen kecil, dan menyimpan resep terbaik.',
  jsonb_build_object(
    'ctaText', 'Join the Community',
    'ctaLink', '/signup',
    'assetUrl', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1400&q=80',
    'assetAlt', 'Barista pouring coffee'
  ),
  jsonb_build_object(
    'ctaText', 'Gabung Komunitas',
    'ctaLink', '/signup',
    'assetUrl', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1400&q=80',
    'assetAlt', 'Barista menuang kopi'
  ),
  3,
  true
where not exists (
  select 1 from public.landing_sections where title = 'From Home Brewers to Professionals'
);

insert into public.faq_items (
  question_en,
  answer_en,
  question_id,
  answer_id,
  order_index,
  is_visible
)
select
  'Do I need an account to read brews and forum posts?',
  'No. Catalog and forum are publicly readable. You only need an account to post, review, and create brews.',
  'Apakah saya perlu akun untuk membaca racikan dan forum?',
  'Tidak. Katalog dan forum bisa dibaca publik. Akun hanya diperlukan untuk posting, review, dan membuat racikan.',
  0,
  true
where not exists (
  select 1 from public.faq_items where question_en = 'Do I need an account to read brews and forum posts?'
);

insert into public.faq_items (
  question_en,
  answer_en,
  question_id,
  answer_id,
  order_index,
  is_visible
)
select
  'Can admins edit landing page content without code changes?',
  'Yes. Admins can manage landing sections and FAQ entries directly from the admin dashboard.',
  'Apakah admin bisa mengubah konten landing tanpa ubah kode?',
  'Ya. Admin dapat mengelola section landing dan entri FAQ langsung dari dashboard admin.',
  1,
  true
where not exists (
  select 1 from public.faq_items where question_en = 'Can admins edit landing page content without code changes?'
);

insert into public.faq_items (
  question_en,
  answer_en,
  question_id,
  answer_id,
  order_index,
  is_visible
)
select
  'How do dark mode and language preferences work?',
  'Your preferences are saved in browser cookies. You can switch theme or language anytime from the header.',
  'Bagaimana preferensi mode gelap dan bahasa bekerja?',
  'Preferensi disimpan di cookie browser. Anda bisa mengganti tema atau bahasa kapan saja dari header.',
  2,
  true
where not exists (
  select 1 from public.faq_items where question_en = 'How do dark mode and language preferences work?'
);
