# eTicket

A Solomon Islands–based, full-stack event discovery and digital ticketing application for Pacific and international events, built with Next.js 16 and Supabase.

## Features

- Public event discovery landing page
- Supabase email authentication and password recovery
- Authenticated overview, event catalogue, ticket wallet, and profile
- Role-protected event management command centre at `/admin`
- Event creation, editing, publishing, capacity monitoring, and safe deletion
- Next.js API layer with bearer-token validation
- Atomic ticket booking with capacity checks
- Row-level security for profiles and tickets
- Credential-free demo mode for local product previews
- Per-event currencies including SBD and other regional or international currencies

## Local development

Install dependencies and start the app:

```bash
npm ci
npm run dev
```

For the complete local preview without a Supabase project:

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

In demo mode, use any valid email and password on the sign-in screen.

## Supabase setup

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run the SQL files in `supabase/migrations/` in filename order. They create the event catalogue, ticket wallet, seed events, security policies, atomic booking, multi-currency support, and administrator controls.

After signing up the account that will manage the platform, promote it once from the Supabase SQL editor. Replace the email with the account you created:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Sign in again and open `/admin`. Customers cannot promote themselves: the database protects role changes and all management operations with row-level security. In demo mode, any signed-in demo account can inspect the complete management workflow.

The browser uses Supabase only for authentication. All application data flows through `/api/events`, `/api/dashboard`, `/api/tickets`, and `/api/profile`; authenticated requests pass the current access token and remain subject to Supabase row-level security.

## Validation

```bash
npm run lint
npm run build
```
