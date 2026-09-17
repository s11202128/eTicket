# eTicket

A Solomon Islands–based, full-stack event discovery and digital ticketing application for Pacific and international events, built with Next.js 16 and Supabase.

## Features

- Public event discovery landing page
- Supabase email authentication and password recovery
- Authenticated overview, event catalogue, ticket wallet, and profile
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

Run the SQL files in `supabase/migrations/` in filename order. The second migration creates the event catalogue, ticket wallet, seed events, security policies, and the atomic `book_event_ticket` database function.

The browser uses Supabase only for authentication. All application data flows through `/api/events`, `/api/dashboard`, `/api/tickets`, and `/api/profile`; authenticated requests pass the current access token and remain subject to Supabase row-level security.

## Validation

```bash
npm run lint
npm run build
```
