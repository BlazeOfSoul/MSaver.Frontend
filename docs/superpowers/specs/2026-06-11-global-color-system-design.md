# Global Color System Design

## Context

MSaver already has global tokens in `src/styles.css`, but colors are still duplicated across component CSS, Chart.js configuration, and fallback palettes for accounts and categories. This makes the UI feel inconsistent and makes future palette changes risky.

The project is an Angular app with Tailwind v4 `@theme`, component-scoped CSS files, shared UI primitives under `src/app/shared/ui`, and home feature fallback palettes in `src/app/features/home/ui/home-page.constants.ts`.

## Goals

- Make `src/styles.css` the single source of truth for UI colors.
- Reuse semantic tokens across component CSS instead of hard-coded `#...`, `rgb(...)`, `rgba(...)`, and ad hoc gradients.
- Provide a shared TypeScript theme layer for Chart.js and application fallback palettes.
- Keep API-provided and user-picked colors as application data, not UI theme tokens.
- Preserve the existing dark MSaver visual direction while making color usage consistent.

## Non-Goals

- Do not normalize persisted API colors into CSS theme tokens.
- Do not remove the color picker behavior for categories or tags.
- Do not rename every existing token if aliases can preserve compatibility with less churn.
- Do not refactor unrelated layout, data flow, or copy.

## Proposed Approach

Use a layered color system:

1. Global CSS tokens live in `src/styles.css`.
2. Component CSS consumes only `var(--...)`, `color-mix(...)` based on tokens, `transparent`, `currentColor`, `inherit`, and data CSS variables such as `--category-color`, `--tag-color`, or `--account-color`.
3. TypeScript code imports shared theme constants/helpers from a new `src/app/shared/theme` area.
4. Chart.js reads values through the shared theme layer instead of local string literals.
5. Account/category fallback palettes move behind shared exported constants so all features and tests reuse one source.

## Token Shape

Keep the existing `--color-ms-*`, `--radius-ms-*`, and `--shadow-ms-*` names, then add missing semantic tokens for repeated UI needs:

- Page: background base and background gradients.
- Text: primary, muted, subtle, inverse.
- Surface: base, raised, elevated, glass, overlay.
- Borders: subtle, default, strong, focus.
- States: success, warning, danger, info plus their soft surface/tint variants.
- Effects: white alpha layers, black alpha layers, glow, focus ring, shadows.
- Chart: tooltip background, legend text, axis text, grid line, fallback series colors.

## Dynamic Data Colors

The app may still pass user/API colors into CSS variables like `--category-color`, `--tag-color`, and `--account-color`. These variables are allowed because they represent domain data, not UI chrome.

Fallback colors for missing account/category/tag data must come from shared theme constants. This keeps default data colors consistent while still allowing real data to override them.

## Testing And Verification

- Add unit tests for the shared theme fallback palettes and CSS variable reader behavior.
- Update existing tests that assert fallback colors to import the shared palette constants.
- Run `npm test` and `npm run build`.
- Run a color-literal search after the refactor. Remaining literals must be limited to:
  - `src/styles.css` token definitions.
  - shared theme constants.
  - test fixtures that intentionally represent API/user data.
  - CSS keywords such as `transparent`, `currentColor`, and `inherit`.
  - browser-specific workarounds that cannot reasonably use CSS variables.

## Rollout

Implement in focused passes:

1. Add shared theme exports and tests.
2. Expand global CSS tokens.
3. Convert Chart.js configuration.
4. Convert shared UI component CSS.
5. Convert feature component CSS.
6. Update tests and run the verification commands.
