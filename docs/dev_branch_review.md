# Dev Branch Review

## Modularization Observations
- **Team components duplication:** `TeamPicker`, `TeamPickerCombo`, and `TeamCrest` share types and image handling. Extract shared types (e.g., `TeamLite`) and a unified `<TeamCrest>` image helper to reduce repetition.
- **Applications table UI size:** `ApplicationsTableUI.tsx` mixes data fetching, task computation, and presentation in one file. Splitting into smaller components or hooks (e.g., `useApplications`, `TaskBadge`) would improve readability and reusability.
- **Task logic centralization:** Task color and label definitions appear in multiple places. Moving them to a constants module (e.g., `admin/applications/taskConfig.ts`) keeps styling consistent.

## Lint Warnings
- `TeamCrest.tsx` and pickers use raw `<img>` tags triggering `@next/next/no-img-element`. Replace with `next/image` or add an eslint disable comment if optimization is not required.
- `TeamPickerCombo.tsx` contains several `any` casts for default values and items. Narrow union types or create helper functions instead of `as any`.
- `TeamsTableUI.tsx` and `team_edit_card.tsx` still rely on `any` parameters; add explicit interfaces for row data and event handlers.

## TypeScript Errors
- `CareerInboxTable.tsx` imports `Group` from `./page` but the page does not export it, and parameters `c` and `it` are implicitly `any`. Export the type from `page.tsx` and annotate the parameters.

## Testing Warnings Fixes
1. **Replace `<img>`:**
   ```tsx
   import Image from "next/image";
   <Image src={url} alt={name} width={size} height={size} className="object-contain" />
   ```
2. **Remove `any` in `TeamPickerCombo`:**
   ```ts
   const id = defaultValue?.mode === "approved"
     ? defaultValue.teamId
     : defaultValue?.mode === "new"
     ? `new:${defaultValue.name}`
     : null;
   ```
   Type `item` as `TeamLite` in the `AutocompleteItem` render function.
3. **Fix `CareerInboxTable` typings:**
   ```ts
   import type { Group } from "./page"; // ensure page exports Group
   groups.map((g: Group) => ... )
   g.applicant?.nationality_codes.map((c: string) => ... )
   g.items.map((it: Item) => ...)
   ```
Implementing these changes will allow `npm run lint` and `npm run typecheck` to complete without errors.

## Next Steps
- Address global linting rules across `auth` and `teams` modules.
- Introduce unit tests for application task resolution logic to prevent regressions.
- Consider extracting shared admin table components for consistent behavior across modules.

