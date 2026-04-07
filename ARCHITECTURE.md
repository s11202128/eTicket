# MVVM Architecture (Next.js App Router)

This project now uses MVVM for feature modules.

## Folder blueprint

- `app/`: Route entry points only (thin pages/layouts)
- `features/<feature>/model/`: Domain types, repositories, API/data access
- `features/<feature>/viewmodel/`: State and UI logic (`use...ViewModel` hooks)
- `features/<feature>/view/`: Presentational UI components
- `lib/`: Shared cross-feature utilities (e.g. Supabase client)

## Current implementation

- Dashboard route entry: `app/dashboard/page.tsx`
- Dashboard Model: `features/dashboard/model/`
- Dashboard ViewModel: `features/dashboard/viewmodel/useDashboardViewModel.ts`
- Dashboard View: `features/dashboard/view/`

## Rules

1. Keep `app/*/page.tsx` simple; delegate behavior to feature modules.
2. Keep View components stateless and focused on rendering props.
3. Put API/database calls in Model repositories, not inside Views.
4. Put loading/error/derived state in ViewModel hooks.
5. Reuse shared clients from `lib/`.
