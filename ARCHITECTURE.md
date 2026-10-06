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
| `auth` | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/logout`, `/auth/callback` | Supabase email + password; email links land on `/auth/callback` |
| `admin` | `/admin`, `/admin/events`, `/admin/events/new`, `/admin/events/[id]/edit`, `/admin/bookings`, `/admin/check-in`, `/admin/users`, `/admin/content`, `/admin/categories`, `/admin/notifications` | Admin-only (check-in: staff too). Guarded by `proxy.ts` and `app/admin/layout.tsx` |
| `shell` | — | `AppShell` wraps signed-in public pages: sidebar, top bar, session guard |
| `dashboard` | `/dashboard` | Stats, next event, recent tickets, upcoming events |
| `events` | `/events`, `/events/[id]` | Browse and book (read-only; events are managed in admin) |
| `tickets` | `/tickets`, `/tickets/[id]` | View, cancel, download, share tickets |
| `profile` | `/profile` | Edit name and avatar |

Shared:
- `components/ui/`: design-system components (Button, Field/Input/Select/Textarea/Switch, Card, Badge, Table, Dialog/ConfirmDialog, Toast, Skeleton, EmptyState, Tabs). Tokens live in `app/globals.css` (light admin theme by default, `.theme-public` for the dark public theme).
- `lib/supabase.ts` (browser client, cookie session), `lib/supabase/server.ts` (server client + `getViewer()`), `lib/database.types.ts`, `lib/format.ts`, `lib/storage.ts`, `lib/csv.ts`, `lib/search.ts`, `lib/useAsyncData.ts`.

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
