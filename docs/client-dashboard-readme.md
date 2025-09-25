# Client dashboard UI overview

This document describes the current client dashboard scaffold so teammates can quickly locate the layout primitives, navigation logic, and placeholder feature views.

## Directory layout

```
src/app/(dashboard)/dashboard/
├── layout.tsx                # Dashboard shell and responsive sidebar integration
├── navigation.ts             # Shared navigation configuration for sidebar + mobile drawer
├── page.tsx                  # Overview page (default route)
├── edit-profile/
│   ├── personal-data/page.tsx
│   ├── football-data/page.tsx
│   └── multimedia/page.tsx
├── edit-template/
│   ├── styles/page.tsx
│   └── structure/page.tsx
└── settings/
    ├── account/page.tsx
    └── subscription/page.tsx
```

Supporting components live under `src/components/dashboard/client/`:

```
Sidebar.tsx      # Navigation renderer shared by desktop sidebar & mobile drawer
PageHeader.tsx   # Standardized page title + breadcrumbs/actions header
SectionCard.tsx  # Shell for grouping related content on a page
FormField.tsx    # Labeled content block for future form controls/inputs
```

## How it works today

1. `layout.tsx` loads the authenticated user context via the existing `getUserProfile` util and surfaces top-level metadata (plan, review status, etc.).
2. The `Sidebar` component receives the `navigation.ts` configuration and renders both the fixed sidebar (`lg` and up) and the mobile drawer trigger (below `lg`).
3. Each feature page imports `PageHeader`, `SectionCard`, and `FormField` to provide consistent spacing, typography, and future form slotting.
4. Current pages contain descriptive placeholders that outline the upcoming business logic to implement (forms, CRUD tables, toggles, etc.).

## Extensibility guidelines

- **Navigation**: add/edit menu items in `navigation.ts`. Submenus are expressed through a `children` array; gating can be applied by enriching the config with `visibleWhen` predicates once user/profile state is wired.
- **Layout**: pages are Server Components by default; convert to Client Components only when interactive state is required. Keep data-fetching in loader utilities to avoid duplicating Supabase queries.
- **Forms**: `FormField` simply wraps label + helper text today—swap the placeholder content with form controls integrated via `react-hook-form` + `zod` when business logic is added.
- **Theming**: `SectionCard` centralizes padding, background, and border styles. Extend it with props for variant/intent if new states (e.g., disabled, warning) are needed.
- **Responsive UX**: the sidebar already provides a mobile drawer. Reuse HeroUI's `Badge`, `Tabs`, `Accordion`, etc. inside page bodies to deliver progressive disclosure on small screens.

## Next steps

Refer to `docs/client-dashboard-roadmap.md` for prioritized workstreams and `docs/client-dashboard-flow.md` for state diagrams. Update all three documents as implementation evolves.
