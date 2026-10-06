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
| `auth` | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/logout` | Supabase email + password auth |
| `shell` | — | `AppShell` wraps signed-in pages: sidebar, top bar, session guard |
| `dashboard` | `/dashboard` | Stats, next event, recent tickets, upcoming events |
| `events` | `/events`, `/events/new`, `/events/[id]`, `/events/[id]/edit` | Browse, create, edit, delete events |
| `tickets` | `/tickets`, `/tickets/[id]`, `/check-in` | Book, view, cancel, share tickets; organizer check-in |
| `profile` | `/profile` | Edit name and avatar |

Shared: `lib/supabase.ts` (typed client), `lib/database.types.ts` (generated
schema types), `lib/format.ts` (date/price formatting).

## Database

Schema lives in `supabase/migrations/`. Access rules are enforced in Postgres
with row-level security, so the client never needs to be trusted:

- `profiles`: users read their own row and may update only `full_name` and `avatar_url`.
- `events`: public read; creators insert, update and delete their own.
- `tickets`: users read and book their own, and may only change status to `cancelled`.
  A trigger blocks bookings for past or full events (`events.capacity`).
- `get_event_booked_counts(event_ids)`: seat counts for everyone.
- `redeem_ticket(ticket_code)`: lets an event's organizer mark a ticket as used.

After a migration, regenerate `lib/database.types.ts`.

## Rules

1. Keep `app/*/page.tsx` simple; delegate behavior to feature modules.
2. Keep View components stateless and focused on rendering props.
3. Put API/database calls in Model repositories, not inside Views.
4. Put loading/error/derived state in ViewModel hooks.
5. Reuse shared clients from `lib/`.
