# E-Ticket

An event ticketing web app built with **Next.js 16** (App Router) and **Supabase** (Auth, Postgres, Storage).

- **Public site**: browse events, book tickets and manage your own tickets.
- **Admin dashboard** (`/admin`): admins only. Admins control everything shown on the public site and check tickets in at the door.

All permissions are enforced in the database (row-level security and database functions). The browser is never trusted.

---

## Getting started

### 1. Requirements
- Node.js 20+
- A Supabase project

### 2. Environment variables
Copy `.env.example` to `.env.local` and fill it in:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase publishable/anon key (safe for the browser) |
| `NEXT_PUBLIC_SITE_URL` | yes in production | Public base URL, used for SEO links, the sitemap and social previews |
| `SITE_TIME_ZONE` | no | Time zone for dates in social preview images, e.g. `Pacific/Guadalcanal` for Solomon Islands time (default `UTC`). Everywhere else, dates show in each visitor's own time zone |

> Never add the Supabase **service_role** key to this app. Anything prefixed `NEXT_PUBLIC_` is sent to the browser, and the app doesn't need it.

### 3. Database
Apply the SQL files in `supabase/migrations/` **in filename order**, either with the Supabase CLI (`supabase db push`) or by pasting each file into the Supabase **SQL Editor**.

> The three oldest files share the prefix `20261006_`. The Supabase CLI requires unique version prefixes, so rename them (e.g. `20261006000000_…`, `20261006000100_…`, `20261006000200_…`) before using `supabase db push`.

### 4. Supabase Auth settings
In the Supabase dashboard under **Authentication → URL Configuration**:
- **Site URL**: your site URL (e.g. `http://localhost:3000`)
- **Redirect URLs**: add `http://localhost:3000/**` (and your production URL with `/**`)

Email links (signup confirmation, password reset) go to `/auth/callback`, which signs the user in and continues to the right page.

Recommended: turn on **Leaked password protection** (Authentication → Sign In / Providers → Email).

### 5. Run it
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

---

## Roles

| Role | Can do |
| --- | --- |
| `attendee` (default) | Browse events, book tickets, view/download/share/cancel own tickets, edit own profile |
| `organizer` | Everything an attendee can, plus host events: create drafts, submit them for approval, see their own attendees and sales, check in guests, assign door staff. Granted when an admin approves their organizer application |
| `admin` | Everything, via the admin dashboard: approve organizers and events, bookings, users and roles, homepage content, categories, notifications, check-in. Admin-created events can be published directly |

**Door staff** isn't a role: an organizer adds people (by email) as staff for a specific event, and they can check in tickets for that event only.

Only admins can open any `/admin` page (checked on the server by `proxy.ts` and the admin layout, and enforced by the database). Everyone else is sent to the homepage with a "no access" message.

Rules enforced by the database:
- Only admins can change roles (approving an organizer application does it for them). Users can't change their own, and an admin can't remove their own admin role.
- Organizer applications: `apply_as_organizer()` creates a pending application; `review_organizer()` (admin) approves, rejects (reason required) or suspends (reason required). Suspended organizers keep their live events but can't create or edit.
- Event workflow: organizers create **drafts**, `submit_event_for_review()` checks they're complete, and `review_event()` (admin) approves (published), requests changes (note required) or rejects (note required). Organizers edit only drafts and events with changes requested; live events change through `update_published_event()`, where major changes (date, venue, prices, lower quantities) send the event back for review.
- Cancellation: organizers ask with `request_event_cancellation()`; admins cancel with `cancel_event()`, which cancels all active tickets and notifies holders.
- Ticket types: each event has one or more ticket types (name, price, quantity, sales window). Capacity is per type; `events.price` ("from" price) and `events.capacity` (total) are kept in sync automatically.
- Tickets are only created by `book_ticket(ticket_type_id, quantity)`, which checks sign-in, that the event is published and upcoming, that the type is on sale and not sold out (with a row lock so the last seat can't be oversold), and the per-person limit.
- Check-in (`check_in_ticket(code, event_id)`): admins, the event's organizer, or its door staff. Results: valid, already used, cancelled, wrong event, wrong date, not found. Each ticket works once, during the entry window (6 hours before the start until the end, or 12 hours after the start without an end time).
- Organizers see tickets and attendee names/emails only for their own events; attendees only their own tickets.
- Every approval, review, cancellation and staff change is written to `audit_log` (admins can read it).
- Events that have ended become `completed` automatically (hourly `pg_cron` job).

### Creating the first admin
Sign up on the site, then run this in the Supabase **SQL Editor** (replace the email):

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

This works from the SQL Editor because no website user is signed in there. From the website, only an existing admin can change roles (Admin → Users).

---

## Routes

### Public
| Route | Description |
| --- | --- |
| `/` | Homepage: hero slider of the 5 soonest upcoming events (falls back to the Admin → Content hero when none), announcement bar, category and region chips, featured and upcoming events |
| `/events` | All upcoming published events, with search, category, region (Solomon Islands / Across the Pacific / International) and date filters, and pagination |
| `/events/[slug]` | Event details, seats left, badges (Sold out / Only X left), Book button. Old `/events/<id>` links redirect here |
| `/tickets` | My tickets, with Upcoming / Past tabs (sign-in required) |
| `/tickets/[code]` | Ticket page: QR code, download PNG/PDF, share, add to calendar, cancel (sign-in required) |
| `/profile` | Edit name and avatar (sign-in required) |
| `/login`, `/signup` | Sign in / create an account; `?next=` returns you to where you were (e.g. the event you were booking) |
| `/forgot-password`, `/reset-password` | Password reset by email |
| `/logout` | Signs out and returns to the homepage |
| `/auth/callback` | Handles email links (exchanges the one-time code for a session) |

Redirects for old links: `/dashboard` → `/tickets`, `/check-in` → `/admin/check-in`.

### Admin (`/admin`, protected on the server by `proxy.ts` and the admin layout)
| Route | Who | Description |
| --- | --- | --- |
| `/admin` | admin | Overview: sales today and this week, upcoming events, events near capacity, recent bookings |
| `/admin/events` | admin | Event table with search and filters; duplicate, cancel (notifies ticket holders), delete |
| `/admin/events/new`, `/admin/events/[id]/edit` | admin | Event form with image upload and live preview |
| `/admin/bookings` | admin | All tickets with filters, cancel, CSV export |
| `/admin/check-in` | admin | Camera QR scanner and manual code entry |
| `/admin/users` | admin | Search users and change roles |
| `/admin/content` | admin | Homepage hero, announcement bar, featured events order |
| `/admin/categories` | admin | Create, edit and delete categories |
| `/admin/notifications` | admin | Send a notification to all users or to one event's ticket holders |

---

## Project structure

```
app/                 Routes only (thin pages and layouts)
  (public)/          Public site, wrapped in the public layout (header, footer)
  admin/             Admin dashboard (own layout)
components/ui/       Design-system components (Button, Field, Dialog, Toast, Table, …)
features/<feature>/  model/ (data access) · viewmodel/ (hooks: state and logic) · view/ (UI)
lib/                 Shared helpers (Supabase clients, formatting, storage, QR, PDF, …)
proxy.ts             Server-side guard for /admin
supabase/migrations/ Database schema, security rules and functions
supabase/tests/      Database tests (pgTAP)
```

More detail in [ARCHITECTURE.md](./ARCHITECTURE.md).

### Design system
Tailwind CSS v4 with design tokens in `app/globals.css`:
- **Admin**: a calm light theme.
- **Public site**: a dark ink "event poster" theme (`.theme-public`), with accent `#FF5A4E` and the Plus Jakarta Sans font.

Every colour pair meets WCAG AA contrast. White text on the accent doesn't, so accent buttons use dark ink text.

---

## Tests

**App logic** (no extra packages; uses Node's built-in test runner):

```bash
npm test
```

This covers the homepage hero slider's event selection: only the 5 soonest upcoming events, sorted soonest first, with past events, events that have already started, and invalid dates excluded. It uses mock events dated relative to "now" (`features/events/model/heroSlides.fixtures.ts`).

**Database** (pgTAP), in `supabase/tests/database/`:
- `booking_and_checkin.test.sql`:
  - **Booking:** sign-in required, sold-out ticket types, per-person limit, past and draft events, cancelling frees a seat, no direct ticket inserts.
  - **Check-in:** one use per ticket, QR payload accepted, wrong date, cancelled and unknown codes, event required for non-admins.
- `platform_workflow.test.sql`:
  - **Roles and organizers:** roles, organizer applications and reviews.
  - **Events:** organizer drafts, submit/review flow, live edits.
  - **Tickets and access:** per-type capacity, door staff and wrong-event check-in, attendee visibility.
  - **Lifecycle:** cancellation, audit log, automatic completion.

Run them either way:
- **Supabase dashboard**: paste a whole file into the SQL Editor and run it. Every line should read `ok`. Each test is rolled back, so no data is left behind; the only lasting change is enabling the `pgtap` extension.
- **Supabase CLI** (local stack): `supabase test db`

---

## Regenerating database types
After changing the schema, regenerate `lib/database.types.ts`:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > lib/database.types.ts
```

Then re-apply the small hand edits noted at the top of that file (nullable columns in `check_in_ticket` and `list_my_notifications`, plus the helper types at the bottom).
