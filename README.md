# Coffee Brew

Coffee Brew is a full-stack coffee community platform built with Next.js + Supabase.
It combines:

- Public content surfaces (Landing, Catalog, Brew Detail, Blog, Forum)
- Role-based operations workspace (admin/superuser dashboards)
- Realtime social features (notifications, forum updates, direct messages)
- Strong moderation and RBAC controls

## Table of Contents

- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Architecture Flow](#architecture-flow)
- [Role Model](#role-model)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Database &amp; Migrations](#database--migrations)
- [Storage Buckets](#storage-buckets)
- [Scripts](#scripts)
- [Route Map](#route-map)
- [API Overview](#api-overview)
- [Testing &amp; Quality Gates](#testing--quality-gates)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Core Features

### Public Experience

- Dynamic multilingual landing page (EN/ID)
- Brew catalog with compare, wishlist, and collection sharing
- Brew detail with radar, reviews, tags, recommendations, and sightings
- Blog platform with CMS-managed posts, rich content, reactions, and TTS
- Forum platform with categories/subforums, polls, moderation reports, realtime activity

### Auth & Identity

- Email/password authentication
- Magic link authentication
- Google OAuth
- Public profiles with privacy controls
- Presence + optional online visibility

### Direct Messages

- 1:1 conversations with group-ready schema
- Realtime message updates
- Typing indicators
- Attachment upload (image)
- Archive/restore
- Per-user DM privacy and user blocking
- DM report flow (private by default, superuser review only via report context)

### Operations & Governance

- Role-based dashboards (`user`, `admin`, `superuser`)
- RBAC matrix editor (superuser)
- User lifecycle controls (disable/delete/verify + role assignment flows)
- Landing/FAQ/Blog CMS
- Brew operations moderation
- Forum moderation and report queue

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Package manager**: pnpm
- **Database/Auth/Realtime/Storage**: Supabase
- **Rich text**: TipTap
- **Validation**: Zod
- **Styling/UI**: Tailwind CSS v4 + custom component system
- **Email**: Resend (transactional), Brevo (newsletter sync)
- **Quality**: Biome (lint/format), Vitest (unit tests), Playwright config included

## Architecture Overview

- `src/app`: App Router pages, layouts, API routes
- `src/components`: UI, forms, feature components
- `src/lib`: business logic, validators, services, helpers
- `supabase/migrations`: SQL migrations (schema, RLS, functions, policies)
- `scripts`: developer tooling (migration runner, user creation/role assignment)
- `tests/unit`: unit tests (Vitest)

Important route groups:

- `src/app/(public)/*` public pages
- `src/app/(me)/*` user dashboard
- `src/app/(dashboard)/*` admin/superuser dashboard
- `src/app/(messages)/*` dedicated full-height messages shell (header only, no public footer)

## Project Structure

High-level repository map:

```text
.
|- .github/
|  |- workflows/
|  |  |- ci.yml
|  |  |- cd-vercel.yml
|  |  |- preview-vercel.yml
|  |  |- playwright.yml
|- e2e/
|- scripts/
|- src/
|  |- app/
|  |  |- (public)/
|  |  |- (auth)/
|  |  |- (me)/
|  |  |- (dashboard)/
|  |  |- (messages)/
|  |  |- api/
|  |- components/
|  |- lib/
|- supabase/
|  |- migrations/
|  |- seed/
|- tests/
|  |- unit/
|  |- integration/
```

Detailed responsibilities:

- `src/app/*`: App Router routes, nested layouts, error boundaries, route handlers.
- `src/app/api/*`: server-side HTTP interfaces for UI actions and admin operations.
- `src/components/*`: reusable UI and feature components (blog, forum, messages, profile, dashboard).
- `src/lib/*`: domain/business logic, validation, permissions, Supabase clients, queries, helpers.
- `supabase/migrations/*`: schema, RLS policies, SQL functions, triggers, publication setup.
- `scripts/*`: migration/status helpers and user bootstrap tools.
- `tests/*`: unit and integration test suites.
- `e2e/*`: Playwright browser scenarios.

## Architecture Flow

Request and data flow in production:

1. Browser hits Next.js route in `src/app/*`.
2. `src/proxy.ts` enforces edge rules (rate limits, maintenance mode, auth cookie short-circuit).
3. Route or server action uses domain logic from `src/lib/*`.
4. Supabase handles Auth, Postgres data access (with RLS), Realtime, and Storage.
5. API routes under `src/app/api/*` return shaped responses for interactive UI features.
6. Client components subscribe to realtime events (forum/messages/notifications) and patch UI state.

Architecture layers:

- Presentation layer: `src/app`, `src/components`
- Application/domain layer: `src/lib` services and guards
- Data layer: Supabase Postgres + Storage + Realtime
- Platform layer: Vercel runtime + GitHub Actions CI/CD

## Role Model

Canonical roles:

- `user`
- `admin`
- `superuser`

High-level behavior:

- `user` accesses `/me/*`
- `admin` and `superuser` access `/dashboard/*`
- Role checks and permissions are enforced by server-side guards + Supabase policies/functions

## Prerequisites

- Node.js 20+ recommended
- pnpm 10+
- Supabase project (URL, anon key, service role key, database URL)
- Optional for full feature set:
  - Resend account + verified sender
  - Brevo account + list IDs
  - Google OAuth credentials (configured in Supabase)
  - Cloudflare Turnstile keys (forum anti-spam controls)

## Environment Variables

Copy `.env.example` to `.env.local` (or `.env`) and fill values.

| Variable                           | Required                    | Description                                             |
| ---------------------------------- | --------------------------- | ------------------------------------------------------- |
| `APP_MAINTENANCE_MODE`           | No (default `false`)      | Redirect non-excluded traffic to `/503` when `true` |
| `NEXT_PUBLIC_APP_URL`            | Yes                         | App base URL (local/prod)                               |
| `NEXT_PUBLIC_SUPABASE_URL`       | Yes                         | Supabase project URL                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Yes                         | Supabase anon key                                       |
| `SUPABASE_SERVICE_ROLE_KEY`      | Yes                         | Service role key for privileged server operations       |
| `SUPABASE_DATABASE_URL`          | Yes (for migration scripts) | Postgres connection string for `migrate:list/push`    |
| `RESEND_API_KEY`                 | Optional                    | Transactional email provider key                        |
| `RESEND_FROM_EMAIL`              | Optional                    | Sender identity used by Resend                          |
| `BREVO_API_KEY`                  | Optional                    | Newsletter sync provider key                            |
| `BREVO_BASE_URL`                 | Optional                    | Brevo API base URL (`https://api.brevo.com/v3`)       |
| `BREVO_LIST_IDS`                 | Optional                    | CSV list IDs for newsletter sync                        |
| `TURNSTILE_SECRET_KEY`           | Optional                    | Server-side Turnstile validation                        |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional                    | Client-side Turnstile site key                          |

## Getting Started

```bash
pnpm install
pnpm dev
```

App default local URL:

- `http://localhost:3000`

## Database & Migrations

All schema changes live in `supabase/migrations`.

Run migration scripts:

```bash
pnpm migrate:list
pnpm migrate:push
```

Notes:

- `SUPABASE_DATABASE_URL` must be valid and URL-safe.
- Do not wrap password in square brackets.
- Percent-encode special password characters as needed.

Seed data:

- `supabase/seed/seed.sql`

Create/promote users quickly:

```bash
pnpm user:create -- --email jane@example.com --password "Str0ngPass!" --role user --display-name "Jane Doe"
pnpm user:create -- --email admin@example.com --password "Str0ngPass!" --role admin --display-name "Admin One"
```

Promote via SQL if needed:

```sql
select public.promote_user_to_role('you@example.com', 'superuser');
```

## Storage Buckets

The app uses Supabase Storage buckets for media uploads.

Required buckets used by code paths:

- `avatars`
- `brew-images`
- `blog-images`
- `blog-media`
- `forum-media`
- `dm-media`
- `tab-icons`

Most upload APIs attempt bucket initialization/creation if missing, but production should pre-provision and validate policy access.

## Scripts

From `package.json`:

- `pnpm dev` start local development server
- `pnpm build` production build
- `pnpm start` run built app
- `pnpm lint` biome check
- `pnpm lint:fix` biome auto-fix
- `pnpm format` biome formatting
- `pnpm typecheck` TypeScript noEmit check
- `pnpm test` run Vitest tests
- `pnpm check:all` build + lint fix + lint + typecheck + tests
- `pnpm migrate:list` inspect migration status
- `pnpm migrate:push` apply migrations
- `pnpm user:create` create/update user + assign role

## Route Map

### Public

- `/`
- `/catalog`
- `/catalog/compare`
- `/brew/[id]`
- `/forum`
- `/forum/f/[subforumSlug]`
- `/forum/[threadId]`
- `/blog`
- `/blog/[slug]`
- `/users/[userId]`
- `/collections/share/[token]`
- `/messages` (authenticated)

### Auth

- `/login`
- `/signup`
- `/session/resolve`

### User Dashboard

- `/me`
- `/me/profile`
- `/me/brews/new`
- `/me/brews/[id]/edit`
- `/me/collections`

### Admin/Superuser Dashboard

- `/dashboard`
- `/dashboard/brews`
- `/dashboard/blog`
- `/dashboard/landing`
- `/dashboard/faq`
- `/dashboard/moderation`
- `/dashboard/moderation/reports`
- `/dashboard/forum`
- `/dashboard/profile`
- `/dashboard/collections`
- `/dashboard/users` (superuser)
- `/dashboard/rbac` (superuser)
- `/dashboard/settings` (superuser)
- `/dashboard/badges` (superuser)

### Status Pages

- `/401`, `/403`, `/404`, `/500`, `/503`

## API Overview

The app uses App Router route handlers under `src/app/api`.

### Key groups

- `api/auth/*`: auth callbacks and session flows
- `api/profile/*`: profile settings, avatar, privacy
- `api/catalog`, `api/brews/*`, `api/reviews/*`: brew lifecycle and review data
- `api/forum/*`: thread/comment/reaction/media/report/poll/mentions
- `api/blog/*` + `api/admin/blog/*`: public blog data + CMS/admin ops
- `api/messages/*`: DM conversations/messages/media/blocks/reports/unread count
- `api/admin/messages/*`: superuser DM report moderation context
- `api/notifications/*`: in-app notifications read/archive/delete
- `api/admin/*`, `api/superuser/*`: moderation, CMS, settings, RBAC, user lifecycle

## Testing & Quality Gates

### Required checks

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

### Playwright

Playwright config is present at `playwright.config.ts`.
Current e2e sample spec is minimal (`e2e/example.spec.ts`) and should be expanded for production-grade CI coverage.

For manual browser validation, include:

- Public routes (`/`, `/catalog`, `/forum`, `/blog`, `/brew/[id]`)
- Role routes (`/me/*`, `/dashboard/*`)
- Messages routes (`/messages`, `/messages?c=<conversationId>`)

## Deployment

Deployment guide:

- [Vercel + Supabase Runbook](development-docs/deploy-vercel-supabase.md)

CI/CD workflows:

- `.github/workflows/ci.yml` required quality gates on PR and `main`
- `.github/workflows/preview-vercel.yml` PR preview deploy + PR comment URL
- `.github/workflows/cd-vercel.yml` production deployment from `main`
- `.github/workflows/playwright.yml` scheduled/manual smoke E2E checks

## Troubleshooting

### `pnpm run migrate:*` issues

- Confirm `SUPABASE_DATABASE_URL` exists and is URL-safe.
- If local CLI linkage fails, migration runner falls back to `pnpm dlx supabase@<version>`.

### Auth redirects or 401/403 surprises

- Validate `NEXT_PUBLIC_APP_URL`.
- Check Supabase Auth Site URL + Redirect URLs.
- Confirm role/profile status in `profiles` and `user_roles`.

### Realtime updates not arriving

- Confirm tables are in `supabase_realtime` publication (migrations handle this for core tables).
- Check browser console/network for websocket or channel errors.

### Media upload failures

- Verify required storage buckets exist.
- Verify MIME/size constraints for each upload endpoint.
- Confirm storage policies and service-role usage in server routes.

### UI route mismatch after refactors

- Ensure role access follows `/me/*` vs `/dashboard/*`.
- `/messages/[conversationId]` is compatibility-safe but canonical route is `/messages?c=<id>`.

## License

[MIT](LICENSE)
