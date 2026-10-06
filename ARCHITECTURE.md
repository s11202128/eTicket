# MVVM Architecture (Next.js App Router)

This project now uses MVVM for feature modules.

## Folder blueprint

- `app/`: Route entry points only (thin pages/layouts)
- `features/<feature>/model/`: Domain types, repositories, API/data access
- `features/<feature>/viewmodel/`: State and UI logic (`use...ViewModel` hooks)
- `features/<feature>/view/`: Presentational UI components
- `lib/`: Shared cross-feature utilities (e.g. Supabase client)

## Current implementation

| Feature | Routes | Notes |
| --- | --- | --- |
| `site` | — | Public layout pieces: header (nav, bell, account menu), announcement bar, notices, footer. Layout: `app/(public)/layout.tsx` |
| `events` | `/`, `/events`, `/events/[slug]` | Server-rendered browsing (`publicEvents.server.ts`); booking via `BookButton` |
| `tickets` | `/tickets`, `/tickets/[code]` | My tickets (Upcoming/Past), ticket page with QR, PNG/PDF, share, calendar, cancel |
| `notifications` | — | Bell dropdown: unread count, list, mark read / mark all read |
| `profile` | `/profile` | Name and avatar (uploaded to the `avatars` bucket) |
| `auth` | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/logout`, `/auth/callback` | Email + password. Email links land on `/auth/callback`. `?next=` returns users to where they were |
| `admin` | `/admin/*` | Admin dashboard (check-in: staff too). Guarded by `proxy.ts` and `app/admin/layout.tsx` |

Redirects kept for old links: `/dashboard` → `/tickets`, `/check-in` → `/admin/check-in`, `/events/<id>` → `/events/<slug>`.

Server vs client: public browsing pages are Server Components (good for SEO and
first load). Signed-in pages check the session on the server (`lib/requireViewer.ts`)
and load data in the browser. Dates are rendered with `components/ui/LocalDateTime.tsx`
so they always show in the visitor's time zone. QR codes are generated in the
browser (`lib/qr.ts`); ticket codes are never sent to third parties.

Shared:
- `components/ui/`: design-system components (Button, Field/Input/Select/Textarea/Switch, Card, Badge, Table, Dialog/ConfirmDialog, Toast, Skeleton, EmptyState, Tabs). Tokens live in `app/globals.css` (light admin theme by default, `.theme-public` for the dark public theme).
- `lib/supabase.ts` (browser client, cookie session), `lib/supabase/server.ts` (server client + `getViewer()`), `lib/database.types.ts`, `lib/format.ts`, `lib/storage.ts`, `lib/siteContent.ts`, `lib/qr.ts`, `lib/ticketImage.ts` (PNG/PDF), `lib/ics.ts`, `lib/csv.ts`, `lib/search.ts`, `lib/useAsyncData.ts`.

## Roles

| Role | Can |
| --- | --- |
| `user` | Browse, book, manage own tickets and profile |
| `staff` | Everything a user can, plus `/admin/check-in` |
| `admin` | Everything, including roles, events, content and notifications |

## Database

Schema lives in `supabase/migrations/`. Access rules are enforced in Postgres
with row-level security and functions, so the client is never trusted:

- `profiles`: users read/edit their own name and avatar; only admins change `role`
  (trigger), and admins can't demote themselves.
- `events`: public reads `published` only; ticket holders can still read their
  events; admins manage all. Events with tickets can't be deleted.
- `tickets`: users read their own; admins read all. No direct writes:
  `book_ticket`, `cancel_my_ticket`, `admin_cancel_ticket`, `check_in_ticket`.
- `categories`, `site_content`: public read, admin write.
- `notifications` (+ `notification_reads` for broadcasts): read via
  `list_my_notifications` / `unread_notification_count`; admins send.
- Admin functions: `admin_stats`, `admin_events_near_capacity`,
  `admin_cancel_event`, `admin_notify_event_holders`, `admin_set_featured_events`.
- Storage buckets: `event-images`, `site-images` (admin write), `avatars`
  (each user writes their own folder); all publicly readable.

After a migration, regenerate `lib/database.types.ts` (see the note at its top).

## Tests and error handling

- Database tests (pgTAP): `supabase/tests/database/` (see README for how to run).
- Every public route and the admin area have `loading.tsx` skeletons and `error.tsx` boundaries (`components/ui/RouteError.tsx`); `app/global-error.tsx` covers root-layout failures and `app/not-found.tsx` unknown URLs.
- SEO: per-event metadata, Open Graph image (`events/[slug]/opengraph-image.tsx`), schema.org Event JSON-LD, `robots.ts` and `sitemap.ts`.
