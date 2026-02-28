# Coffee Brew

Coffee-themed full-stack web app built with Next.js App Router, Supabase, Resend, and Brevo newsletter provider.

## Stack

- Next.js 16 + TypeScript
- Supabase (Auth, Postgres, Storage, Realtime)
- Resend (transactional email events)
- Brevo provider adapter (Newsletter)
- Tailwind CSS v4 with custom coffee design tokens
- Biome (lint + format)
- Vitest for unit tests

## Features Implemented

- Dynamic landing page with multilingual (`en` + `id`) sections from `landing_sections`
- System-aware dark mode with manual persisted preference
- App-wide language switching (`cb_locale`) and theme switching (`cb_theme`)
- New public pages: About, Contact, Blog index/detail, human sitemap
- SEO metadata sitemap (`/sitemap.xml`)
- Admin-editable FAQ CMS (`faq_items`) with bilingual content
- Auth flows: email/password, Google OAuth, magic link
- Role model: `user`, `admin`, `superuser` with RBAC matrix
- Brew CRUD and personal dashboard
- Public brew catalog (published entries)
- Forum (threads/comments/reactions) + realtime update notice
- Brew reviews with 1-5 scoring dimensions and one review per user/brew
- Moderation hide/unhide for brews/threads/comments
- Superuser controls for RBAC and user lifecycle (block/disable/delete)
- Transactional email service wrapper via Resend
- Newsletter subscribe/unsubscribe via provider adapter

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DATABASE_URL=postgresql://postgres.your-project:database-password@database-host:database-port/postgres

RESEND_API_KEY=YOUR_RESEND_API_KEY
RESEND_FROM_EMAIL=Coffee Brew <noreply@yourdomain.com>

BREVO_API_KEY=YOUR_BREVO_API_KEY
BREVO_BASE_URL=https://api.brevo.com/v3
BREVO_LIST_IDS=2,7
# Optional legacy fallback:
# BREVO_LIST_ID=2
```

## Supabase Setup

1. Run migration SQL in [supabase/migrations/202602280001_init.sql](/d:/Samuel/Projects/coffee-brew/supabase/migrations/202602280001_init.sql).
2. Run migration SQL in [supabase/migrations/202602280002_content_localization_and_faq.sql](/d:/Samuel/Projects/coffee-brew/supabase/migrations/202602280002_content_localization_and_faq.sql).
3. Run seed SQL in [supabase/seed/seed.sql](/d:/Samuel/Projects/coffee-brew/supabase/seed/seed.sql).
4. Create your first auth user, then promote to superuser:

```sql
select public.promote_user_to_role('you@example.com', 'superuser');
```

## Run

```bash
pnpm install
pnpm dev
```

## Deployment

- Vercel + Supabase runbook: [docs/deploy-vercel-supabase.md](/d:/Samuel/Projects/coffee-brew/docs/deploy-vercel-supabase.md)

## Quality Checks

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm typecheck
pnpm test
```

## Database Migrations

Use `SUPABASE_DATABASE_URL` from your environment:

```bash
pnpm migrate:list
pnpm migrate:push
```

`SUPABASE_DATABASE_URL` must be a valid URL-encoded Postgres connection string.
Do not wrap the password in `[]`. If your password has special characters, percent-encode them.

## Create User + Role

Create or update an auth user and assign role (`user`, `admin`, `superuser`):

```bash
pnpm user:create -- --email jane@example.com --password "Str0ngPass!" --role user --display-name "Jane Doe"
pnpm user:create -- --email admin@example.com --password "Str0ngPass!" --role admin --display-name "Admin One"
```

## API Surface

- `GET /api/landing`
- `GET /api/faq`
- `POST|PUT|DELETE /api/admin/landing/sections`
- `POST|PUT|DELETE /api/admin/faq`
- `POST /api/admin/moderation/hide`
- `GET|POST /api/brews`
- `GET|PATCH|DELETE /api/brews/:id`
- `GET /api/catalog`
- `GET|POST /api/forum/threads`
- `GET|POST /api/forum/threads/:id/comments`
- `POST /api/forum/reactions`
- `GET|PUT /api/reviews/:brewId`
- `GET|PUT /api/superuser/rbac`
- `POST /api/superuser/users/:id/block`
- `POST /api/superuser/users/:id/disable`
- `DELETE /api/superuser/users/:id`
- `POST /api/newsletter/subscribe`
- `POST /api/newsletter/unsubscribe`
