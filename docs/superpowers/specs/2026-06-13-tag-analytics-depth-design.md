# Tag Analytics Depth Design

## Context

MSaver already has an Analytics tab with a dedicated Tags view. The current Tags view shows one chart, "Расходы по тегам", with a chart type selector, a top/all limit selector, and tag filter chips.

The frontend already loads the data needed for deeper tag analytics:

- Year transactions for the selected account scope.
- Tag groups with assigned categories.
- Category colors and expense category totals.
- Month labels and Chart.js support through the shared `ms-chart-card` component.

This means the Tags view can become more analytical without adding backend endpoints.

## Goals

- Help users understand which tags consume the most money.
- Show when tag expenses happen across the selected year.
- Explain what makes a selected tag expensive by showing its category composition.
- Keep the existing chart controls and tag filter chip workflow.
- Respect the selected account filter and current year transaction scope.

## Non-Goals

- Do not add new API endpoints.
- Do not introduce a new charting library.
- Do not change tag management behavior in the Categories tab.
- Do not redesign the whole Analytics tab.
- Do not add predictive analytics or budgeting rules.

## Proposed Experience

The Tags view will contain three chart cards:

1. **Расходы по тегам**
   - Keeps the existing overview chart.
   - Supports bar and doughnut views.
   - Supports top 5, top 10, top 15, and all tags.
   - Tag filter chips continue to select either all tags or one tag.

2. **Динамика по месяцам**
   - Shows monthly tag expenses for the selected year.
   - When "Все теги" is selected, the chart shows the highest-spend visible tags as separate line datasets.
   - When a single tag is selected, the chart shows that tag's monthly expense line.
   - Uses the selected account scope already applied to year transactions.

3. **Состав тега**
   - Shows the expense categories that contribute to the selected tag.
   - When a single tag is selected, it shows that tag's assigned categories with non-zero expense.
   - When "Все теги" is selected, it shows the composition of the highest-spend visible tag so the chart is useful immediately.
   - Uses category colors for chart slices or bars.

## Data Model Changes

Add lightweight frontend-only models in `home-page.models.ts`:

- A tag monthly series model with tag id, tag name, tag color, and 12 monthly values.
- A tag composition model with the active tag id/name and category breakdown items.

The dashboard store will compute these models from existing year transactions and tag groups.

## Data Flow

1. `HomeDashboardStore` filters year transactions by the selected account, as it already does.
2. It computes expense totals by category and month.
3. It maps each tag to:
   - Total yearly expense.
   - Monthly expense values from assigned expense categories.
   - Category composition values from assigned expense categories.
4. `HomePageComponent` passes the new computed inputs into `AnalyticsTabComponent`.
5. `AnalyticsTabComponent` converts the computed models into `HomeChartDataset` arrays for `ms-chart-card`.

## Empty States

The existing chart card empty state remains the fallback for charts with no positive data.

If there are no tags with expenses, all three chart cards can render with empty datasets and the existing empty state copy.

## Testing And Verification

- Add helper tests for building tag monthly datasets and selecting tag composition.
- Add component tests proving:
  - The Tags view renders three chart cards.
  - Selecting one tag narrows the monthly trend and composition charts.
  - The all-tags state uses the top visible tag for composition.
  - Existing tag limit and chart type behavior still works.
- Add store or mapper coverage for computing monthly tag analytics from year transactions if the logic lives outside the component.
- Run focused Angular tests for the Analytics tab and any changed store/model tests.
- Run `npm run build` after the focused tests pass.

## Implementation Notes

- Prefer pure helper functions for chart dataset shaping so the behavior is easy to test.
- Reuse `MS_ANALYTICS_CHART_COLORS` and existing fallback palettes.
- Keep layout consistent with the current `analytics-section--wide` grid.
- Keep text concise and in Russian in the UI.
