# Global Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize MSaver UI colors into a global CSS/TypeScript color system and replace scattered local UI color literals with reusable tokens.

**Architecture:** `src/styles.css` remains the CSS source of truth and gains semantic tokens for text, surfaces, overlays, state tints, alpha layers, and chart UI colors. A new `src/app/shared/theme` module exposes fallback data palettes and a safe CSS-variable reader for TypeScript-only consumers such as Chart.js. Feature code keeps API/user-picked colors as data while importing shared fallback palettes.

**Tech Stack:** Angular 21, component-scoped CSS, Tailwind v4 `@theme`, TypeScript strict mode, Vitest through `ng test`, Chart.js.

---

## File Structure

- Create `src/app/shared/theme/theme-colors.ts`: shared fallback palettes, chart CSS variable names, and `readThemeColor()` helper.
- Create `src/app/shared/theme/theme-colors.spec.ts`: unit tests for fallback palette exports and CSS variable reading.
- Modify `src/styles.css`: add semantic CSS tokens and replace local global hard-coded alpha colors with those tokens.
- Modify `src/app/features/home/ui/home-page.constants.ts`: re-export shared account/category fallback palettes instead of owning literal arrays.
- Modify `src/app/features/home/ui/components/chart-card/chart-card.component.ts`: read chart UI colors from shared theme helper and fallback palette.
- Modify `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts`: replace local chart/fallback literals with shared palette constants.
- Modify component CSS files under `src/app/shared/ui`, `src/app/features/auth/ui`, and `src/app/features/home/ui`: replace UI color literals with `var(--...)` or `color-mix(...)` from global tokens.
- Modify tests that currently assert shared fallback colors: import shared constants where those colors are defaults; keep literals only where the test models API/user-provided data.

---

### Task 1: Add Shared Theme Constants And CSS Variable Reader

**Files:**
- Create: `src/app/shared/theme/theme-colors.spec.ts`
- Create: `src/app/shared/theme/theme-colors.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/shared/theme/theme-colors.spec.ts`:

```typescript
import {
    MS_ACCOUNT_COLORS,
    MS_CATEGORY_COLORS,
    MS_CHART_THEME,
    readThemeColor,
} from './theme-colors';

describe('theme colors', () => {
    it('exposes the shared account fallback palette', () => {
        expect(MS_ACCOUNT_COLORS).toEqual(['#23c78b', '#ffd166', '#67a6c1', '#ff8fab', '#c77dff']);
    });

    it('exposes the shared category fallback palette', () => {
        expect(MS_CATEGORY_COLORS).toEqual(['#23c78b', '#67a6c1', '#ff6f91', '#e8b45d', '#c77dff', '#79e0b5']);
    });

    it('keeps chart theme keys mapped to CSS variables', () => {
        expect(MS_CHART_THEME.tooltipBackground).toBe('--color-ms-chart-tooltip-bg');
        expect(MS_CHART_THEME.legendText).toBe('--color-ms-chart-legend-text');
        expect(MS_CHART_THEME.axisText).toBe('--color-ms-chart-axis-text');
        expect(MS_CHART_THEME.gridLine).toBe('--color-ms-chart-grid-line');
        expect(MS_CHART_THEME.fallbackSeries).toBe('--color-ms-chart-series-fallback');
    });

    it('reads a CSS variable from a provided root element', () => {
        const root = document.createElement('div');
        root.style.setProperty('--color-ms-chart-axis-text', 'rgba(255, 255, 255, 0.44)');

        expect(readThemeColor('--color-ms-chart-axis-text', '#fff', root)).toBe('rgba(255, 255, 255, 0.44)');
    });

    it('returns the fallback when the CSS variable is missing', () => {
        const root = document.createElement('div');

        expect(readThemeColor('--color-ms-chart-axis-text', '#fff', root)).toBe('#fff');
    });

    it('returns the fallback outside the browser', () => {
        expect(readThemeColor('--color-ms-chart-axis-text', '#fff', null)).toBe('#fff');
    });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx ng test --include src/app/shared/theme/theme-colors.spec.ts
```

Expected: FAIL because `src/app/shared/theme/theme-colors.ts` does not exist.

- [ ] **Step 3: Add the minimal implementation**

Create `src/app/shared/theme/theme-colors.ts`:

```typescript
export const MS_ACCOUNT_COLORS = ['#23c78b', '#ffd166', '#67a6c1', '#ff8fab', '#c77dff'] as const;

export const MS_CATEGORY_COLORS = ['#23c78b', '#67a6c1', '#ff6f91', '#e8b45d', '#c77dff', '#79e0b5'] as const;

export const MS_CHART_THEME = {
    tooltipBackground: '--color-ms-chart-tooltip-bg',
    tooltipTitle: '--color-ms-chart-tooltip-title',
    tooltipBody: '--color-ms-chart-tooltip-body',
    tooltipBorder: '--color-ms-chart-tooltip-border',
    legendText: '--color-ms-chart-legend-text',
    axisText: '--color-ms-chart-axis-text',
    axisSubtleText: '--color-ms-chart-axis-subtle-text',
    gridLine: '--color-ms-chart-grid-line',
    fallbackSeries: '--color-ms-chart-series-fallback',
} as const;

export function readThemeColor(
    variableName: string,
    fallback: string,
    root: HTMLElement | null = getDocumentRoot(),
): string {
    if (!root) {
        return fallback;
    }

    const inlineValue = root.style.getPropertyValue(variableName).trim();

    if (inlineValue) {
        return inlineValue;
    }

    if (typeof getComputedStyle === 'undefined') {
        return fallback;
    }

    const computedValue = getComputedStyle(root).getPropertyValue(variableName).trim();

    return computedValue || fallback;
}

function getDocumentRoot(): HTMLElement | null {
    return typeof document === 'undefined' ? null : document.documentElement;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npx ng test --include src/app/shared/theme/theme-colors.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit this task**

Run:

```bash
git add src/app/shared/theme/theme-colors.ts src/app/shared/theme/theme-colors.spec.ts
git commit -m "feat: add shared color theme constants"
```

---

### Task 2: Move Home Fallback Palettes To Shared Theme

**Files:**
- Modify: `src/app/features/home/ui/home-page.constants.ts`
- Modify: `src/app/features/home/ui/home-page.constants.spec.ts`
- Modify: `src/app/features/home/ui/home-page.mappers.spec.ts`
- Modify: `src/app/features/home/ui/home-page.component.spec.ts`
- Modify: `src/app/features/home/ui/tab-panels/accounts-tab/accounts-tab.component.spec.ts`
- Modify: `src/app/features/home/ui/tab-panels/categories-tab/categories-tab.component.spec.ts`
- Modify: `src/app/features/home/ui/tab-panels/overview-tab/overview-tab.component.spec.ts`

- [ ] **Step 1: Write or update the constants test**

Update `src/app/features/home/ui/home-page.constants.spec.ts` to prove home constants reuse shared theme values:

```typescript
import { MS_ACCOUNT_COLORS, MS_CATEGORY_COLORS } from '../../../shared/theme/theme-colors';
import { ACCOUNT_COLORS, CATEGORY_COLORS } from './home-page.constants';

describe('home page constants', () => {
    it('reuses the shared account fallback palette', () => {
        expect(ACCOUNT_COLORS).toBe(MS_ACCOUNT_COLORS);
    });

    it('reuses the shared category fallback palette', () => {
        expect(CATEGORY_COLORS).toBe(MS_CATEGORY_COLORS);
    });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx ng test --include src/app/features/home/ui/home-page.constants.spec.ts
```

Expected: FAIL because `ACCOUNT_COLORS` and `CATEGORY_COLORS` are still local arrays.

- [ ] **Step 3: Replace local palette ownership with shared re-exports**

In `src/app/features/home/ui/home-page.constants.ts`, replace the two literal array exports with:

```typescript
import { MS_ACCOUNT_COLORS, MS_CATEGORY_COLORS } from '../../../shared/theme/theme-colors';
import { MsSelectOption } from '../../../shared/ui/select/select';
import { HomeTabItem } from './home-page.models';

export const ACCOUNT_COLORS = MS_ACCOUNT_COLORS;
export const CATEGORY_COLORS = MS_CATEGORY_COLORS;
```

Keep the existing `CURRENCY_OPTIONS` and `HOME_TABS` content below those exports unchanged.

- [ ] **Step 4: Update tests that assert fallback colors**

Where a test asserts app fallback defaults, import `MS_ACCOUNT_COLORS` or `MS_CATEGORY_COLORS` and use indexes instead of duplicated literals. Keep literal colors only for API/user data fixtures.

Example replacement:

```typescript
import { MS_CATEGORY_COLORS } from '../../../shared/theme/theme-colors';

expect(firstCategory?.style.getPropertyValue('--category-color')).toBe(MS_CATEGORY_COLORS[0]);
```

- [ ] **Step 5: Run related tests and verify GREEN**

Run:

```bash
npx ng test --include src/app/features/home/ui/home-page.constants.spec.ts --include src/app/features/home/ui/home-page.mappers.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

Run:

```bash
git add src/app/shared/theme/theme-colors.ts src/app/features/home/ui/home-page.constants.ts src/app/features/home/ui/home-page.constants.spec.ts src/app/features/home/ui/home-page.mappers.spec.ts
git commit -m "refactor: reuse shared home color palettes"
```

---

### Task 3: Add Missing Global CSS Color Tokens

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add semantic tokens under the existing `@theme` block**

Insert these tokens after the current state colors in `src/styles.css`:

```css
    --color-ms-text-primary: var(--color-ms-light);
    --color-ms-text-muted: var(--color-ms-light-dark);
    --color-ms-text-subtle: rgba(255, 255, 255, 0.56);
    --color-ms-text-faint: rgba(255, 255, 255, 0.38);
    --color-ms-text-inverse: #04120d;
    --color-ms-text-on-danger: #fff7fb;
    --color-ms-text-danger-soft: #fecaca;
    --color-ms-text-success-soft: #d1fae5;

    --color-ms-page-bg-start: #070b12;
    --color-ms-page-bg-mid: #0b1210;
    --color-ms-page-bg-end: #060807;
    --color-ms-page-glow-primary: rgba(31, 180, 127, 0.07);
    --color-ms-page-glow-info: rgba(103, 166, 193, 0.045);
    --color-ms-page-glow-accent: rgba(199, 125, 255, 0.035);
    --color-ms-page-sheen: rgba(255, 255, 255, 0.018);

    --color-ms-white-alpha-015: rgba(255, 255, 255, 0.015);
    --color-ms-white-alpha-02: rgba(255, 255, 255, 0.02);
    --color-ms-white-alpha-025: rgba(255, 255, 255, 0.025);
    --color-ms-white-alpha-03: rgba(255, 255, 255, 0.03);
    --color-ms-white-alpha-035: rgba(255, 255, 255, 0.035);
    --color-ms-white-alpha-04: rgba(255, 255, 255, 0.04);
    --color-ms-white-alpha-045: rgba(255, 255, 255, 0.045);
    --color-ms-white-alpha-05: rgba(255, 255, 255, 0.05);
    --color-ms-white-alpha-055: rgba(255, 255, 255, 0.055);
    --color-ms-white-alpha-06: rgba(255, 255, 255, 0.06);
    --color-ms-white-alpha-07: rgba(255, 255, 255, 0.07);
    --color-ms-white-alpha-08: rgba(255, 255, 255, 0.08);
    --color-ms-white-alpha-09: rgba(255, 255, 255, 0.09);
    --color-ms-white-alpha-1: rgba(255, 255, 255, 0.1);
    --color-ms-white-alpha-12: rgba(255, 255, 255, 0.12);
    --color-ms-white-alpha-14: rgba(255, 255, 255, 0.14);
    --color-ms-white-alpha-16: rgba(255, 255, 255, 0.16);
    --color-ms-white-alpha-18: rgba(255, 255, 255, 0.18);
    --color-ms-white-alpha-22: rgba(255, 255, 255, 0.22);
    --color-ms-white-alpha-46: rgba(255, 255, 255, 0.46);
    --color-ms-white-alpha-55: rgba(255, 255, 255, 0.55);
    --color-ms-white-alpha-58: rgba(255, 255, 255, 0.58);
    --color-ms-white-alpha-62: rgba(255, 255, 255, 0.62);
    --color-ms-white-alpha-66: rgba(255, 255, 255, 0.66);
    --color-ms-white-alpha-68: rgba(255, 255, 255, 0.68);
    --color-ms-white-alpha-72: rgba(255, 255, 255, 0.72);
    --color-ms-white-alpha-78: rgba(255, 255, 255, 0.78);

    --color-ms-black-alpha-16: rgba(0, 0, 0, 0.16);
    --color-ms-black-alpha-18: rgba(0, 0, 0, 0.18);
    --color-ms-black-alpha-22: rgba(0, 0, 0, 0.22);
    --color-ms-black-alpha-24: rgba(0, 0, 0, 0.24);
    --color-ms-black-alpha-26: rgba(0, 0, 0, 0.26);
    --color-ms-black-alpha-28: rgba(0, 0, 0, 0.28);
    --color-ms-black-alpha-3: rgba(0, 0, 0, 0.3);
    --color-ms-black-alpha-32: rgba(0, 0, 0, 0.32);
    --color-ms-black-alpha-42: rgba(0, 0, 0, 0.42);

    --color-ms-primary-alpha-07: rgba(35, 199, 139, 0.07);
    --color-ms-primary-alpha-08: rgba(35, 199, 139, 0.08);
    --color-ms-primary-alpha-09: rgba(35, 199, 139, 0.09);
    --color-ms-primary-alpha-11: rgba(35, 199, 139, 0.11);
    --color-ms-primary-alpha-12: rgba(35, 199, 139, 0.12);
    --color-ms-primary-alpha-14: rgba(35, 199, 139, 0.14);
    --color-ms-primary-alpha-16: rgba(35, 199, 139, 0.16);
    --color-ms-primary-alpha-18: rgba(35, 199, 139, 0.18);
    --color-ms-primary-alpha-2: rgba(35, 199, 139, 0.2);
    --color-ms-primary-alpha-22: rgba(35, 199, 139, 0.22);
    --color-ms-primary-alpha-24: rgba(35, 199, 139, 0.24);
    --color-ms-primary-alpha-28: rgba(35, 199, 139, 0.28);
    --color-ms-primary-deep-alpha-14: rgba(20, 154, 110, 0.14);

    --color-ms-danger-alpha-09: rgba(255, 111, 145, 0.09);
    --color-ms-danger-alpha-12: rgba(239, 68, 68, 0.12);
    --color-ms-danger-alpha-18: rgba(239, 68, 68, 0.18);
    --color-ms-danger-alpha-2: rgba(255, 111, 145, 0.2);
    --color-ms-danger-alpha-88: rgba(255, 111, 145, 0.88);
    --color-ms-success-alpha-12: rgba(16, 185, 129, 0.12);

    --color-ms-overlay-backdrop: rgba(2, 4, 4, 0.72);
    --color-ms-overlay-surface: rgba(2, 4, 4, 0.76);
    --color-ms-loader-bg: rgba(11, 18, 16, 0.86);
    --color-ms-input-autofill: rgba(71, 86, 99, 0.92);
    --color-ms-input-autofill-hover: rgba(63, 78, 90, 0.94);

    --color-ms-chart-tooltip-bg: #0e1512;
    --color-ms-chart-tooltip-title: #ffffff;
    --color-ms-chart-tooltip-body: rgba(255, 255, 255, 0.78);
    --color-ms-chart-tooltip-border: rgba(35, 199, 139, 0.18);
    --color-ms-chart-legend-text: rgba(255, 255, 255, 0.72);
    --color-ms-chart-axis-text: rgba(255, 255, 255, 0.44);
    --color-ms-chart-axis-subtle-text: rgba(255, 255, 255, 0.38);
    --color-ms-chart-grid-line: rgba(255, 255, 255, 0.06);
    --color-ms-chart-series-fallback: #23c78b;
```

- [ ] **Step 2: Replace global hard-coded colors with new tokens**

In `src/styles.css`, replace the page background and button/input global colors with token references. Examples:

```css
background:
    linear-gradient(120deg, var(--color-ms-page-glow-primary), var(--color-ms-page-glow-info), var(--color-ms-page-glow-accent)),
    linear-gradient(180deg, var(--color-ms-page-sheen) 0%, transparent 18rem),
    linear-gradient(145deg, var(--color-ms-page-bg-start) 0%, var(--color-ms-page-bg-mid) 46%, var(--color-ms-page-bg-end) 100%);
```

```css
::selection {
    color: var(--color-ms-text-primary);
    background: var(--color-ms-primary-alpha-28);
}
```

```css
ms-button.ms-btn.ms-btn-primary {
    --bg-color: var(--color-ms-primary-deep);
    --text-color: var(--color-ms-chart-tooltip-title);
    --border-color: color-mix(in oklab, var(--color-ms-primary-deep), white 7%);
    --accent-color: var(--color-ms-primary-soft);
    --glow-color: var(--color-ms-primary-deep-alpha-14);
}
```

- [ ] **Step 3: Run build to catch CSS syntax errors**

Run:

```bash
npm run build
```

Expected: PASS or only pre-existing unrelated failures. If this fails because an Angular style budget is exceeded, continue only after noting the exact budget failure and reducing duplicated CSS where possible.

- [ ] **Step 4: Commit this task**

Run:

```bash
git add src/styles.css
git commit -m "style: add global color tokens"
```

---

### Task 4: Convert Chart.js To Shared Theme Colors

**Files:**
- Modify: `src/app/features/home/ui/components/chart-card/chart-card.component.ts`
- Create: `src/app/features/home/ui/components/chart-card/chart-card.component.spec.ts`

- [ ] **Step 1: Add a focused unit test for fallback legend color**

Create `src/app/features/home/ui/components/chart-card/chart-card.component.spec.ts` if it does not exist:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
import { ChartCardComponent } from './chart-card.component';

describe('ChartCardComponent', () => {
    let fixture: ComponentFixture<ChartCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChartCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ChartCardComponent);
        fixture.componentRef.setInput('title', 'Chart');
        fixture.componentRef.setInput('subtitle', 'Summary');
    });

    it('uses the shared category palette as its final legend color fallback', () => {
        expect(fixture.componentInstance.legendColor(0)).toBe(MS_CATEGORY_COLORS[0]);
    });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx ng test --include src/app/features/home/ui/components/chart-card/chart-card.component.spec.ts
```

Expected: FAIL because `legendColor()` still falls back to a local literal that is equal by value but not explicitly sourced from `MS_CATEGORY_COLORS`. If the test passes by value, temporarily assert against a spy-free import behavior by proceeding to Step 3 and use the final color-literal search as the RED guard for this task.

- [ ] **Step 3: Import shared theme utilities**

At the top of `chart-card.component.ts`, add:

```typescript
import {
    MS_CATEGORY_COLORS,
    MS_CHART_THEME,
    readThemeColor,
} from '../../../../../shared/theme/theme-colors';
```

- [ ] **Step 4: Read chart UI colors once per render**

Inside `renderChart()`, before creating datasets, add:

```typescript
const chartTheme = {
    legendText: readThemeColor(MS_CHART_THEME.legendText, 'rgba(255,255,255,0.72)'),
    tooltipBackground: readThemeColor(MS_CHART_THEME.tooltipBackground, '#0e1512'),
    tooltipTitle: readThemeColor(MS_CHART_THEME.tooltipTitle, '#ffffff'),
    tooltipBody: readThemeColor(MS_CHART_THEME.tooltipBody, 'rgba(255,255,255,0.78)'),
    tooltipBorder: readThemeColor(MS_CHART_THEME.tooltipBorder, 'rgba(35,199,139,0.18)'),
    axisText: readThemeColor(MS_CHART_THEME.axisText, 'rgba(255,255,255,0.44)'),
    axisSubtleText: readThemeColor(MS_CHART_THEME.axisSubtleText, 'rgba(255,255,255,0.38)'),
    gridLine: readThemeColor(MS_CHART_THEME.gridLine, 'rgba(255,255,255,0.06)'),
};
```

Then replace Chart.js literal color values with `chartTheme.*` values.

- [ ] **Step 5: Replace the legend fallback literal**

Change the end of `legendColor()` to:

```typescript
return (
    firstDataset?.colors?.[index] ??
    this.datasets()[index]?.color ??
    firstDataset?.color ??
    MS_CATEGORY_COLORS[0]
);
```

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
npx ng test --include src/app/features/home/ui/components/chart-card/chart-card.component.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit this task**

Run:

```bash
git add src/app/features/home/ui/components/chart-card/chart-card.component.ts src/app/features/home/ui/components/chart-card/chart-card.component.spec.ts
git commit -m "refactor: read chart colors from shared theme"
```

---

### Task 5: Convert Analytics Fallback Colors To Shared Theme

**Files:**
- Modify: `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts`
- Modify: `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts`

- [ ] **Step 1: Update analytics tests to reference shared fallback palette where colors are defaults**

In `analytics-tab.component.spec.ts`, import:

```typescript
import { MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
```

Replace expectations for fallback-generated colors with `MS_CATEGORY_COLORS[index]`. Keep literal colors in helper data when the test represents API/user-provided category colors.

- [ ] **Step 2: Run focused tests and verify RED or existing literal coverage**

Run:

```bash
npx ng test --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
```

Expected: PASS or FAIL depending on exact replacements. If PASS, use `rg -n "#23c78b|#ff6f91|#67a6c1|#e8b45d|#c77dff|#79e0b5" src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts` as the failing guard before implementation.

- [ ] **Step 3: Import shared palette in the component**

In `analytics-tab.component.ts`, add:

```typescript
import { MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
```

- [ ] **Step 4: Replace local fallback arrays and static fallback literals**

Replace:

```typescript
const colors = ['#23c78b', '#67a6c1', '#ff6f91', '#e8b45d', '#c77dff', '#79e0b5'];
```

with:

```typescript
const colors = MS_CATEGORY_COLORS;
```

Replace hard-coded fallback colors in static empty states or generated datasets with `MS_CATEGORY_COLORS[index]` where the value is not API/user data.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npx ng test --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

Run:

```bash
git add src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
git commit -m "refactor: reuse shared analytics palette"
```

---

### Task 6: Convert CSS UI Color Literals To Global Tokens

**Files:**
- Modify: `src/app/app.css`
- Modify: `src/app/shared/ui/dialog-shell/dialog-shell.css`
- Modify: `src/app/shared/ui/select/select.css`
- Modify: `src/app/shared/ui/surface/surface.css`
- Modify: `src/app/features/auth/ui/auth-page.component.css`
- Modify: `src/app/features/home/ui/home-page.component.css`
- Modify: `src/app/features/home/ui/components/*.css`
- Modify: `src/app/features/home/ui/tab-panels/*.css`

- [ ] **Step 1: Capture the current CSS literal inventory**

Run:

```bash
rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|linear-gradient\(|radial-gradient\(|conic-gradient\(" src -g "*.css"
```

Expected: many matches. Save the output mentally as the before snapshot; do not commit it.

- [ ] **Step 2: Replace common white alpha values**

Use token replacements consistently:

```css
rgba(255, 255, 255, 0.03)  -> var(--color-ms-white-alpha-03)
rgba(255, 255, 255, 0.04)  -> var(--color-ms-white-alpha-04)
rgba(255, 255, 255, 0.05)  -> var(--color-ms-white-alpha-05)
rgba(255, 255, 255, 0.06)  -> var(--color-ms-white-alpha-06)
rgba(255, 255, 255, 0.08)  -> var(--color-ms-white-alpha-08)
rgba(255, 255, 255, 0.1)   -> var(--color-ms-white-alpha-1)
rgba(255, 255, 255, 0.12)  -> var(--color-ms-white-alpha-12)
rgba(255, 255, 255, 0.18)  -> var(--color-ms-white-alpha-18)
rgba(255, 255, 255, 0.22)  -> var(--color-ms-white-alpha-22)
```

- [ ] **Step 3: Replace common black alpha values**

Use token replacements consistently:

```css
rgba(0, 0, 0, 0.16) -> var(--color-ms-black-alpha-16)
rgba(0, 0, 0, 0.18) -> var(--color-ms-black-alpha-18)
rgba(0, 0, 0, 0.22) -> var(--color-ms-black-alpha-22)
rgba(0, 0, 0, 0.28) -> var(--color-ms-black-alpha-28)
rgba(0, 0, 0, 0.3)  -> var(--color-ms-black-alpha-3)
rgba(0, 0, 0, 0.42) -> var(--color-ms-black-alpha-42)
```

- [ ] **Step 4: Replace semantic state and text literals**

Use token replacements consistently:

```css
#ffffff                        -> var(--color-ms-chart-tooltip-title)
#04120d                        -> var(--color-ms-text-inverse)
#fff7fb                        -> var(--color-ms-text-on-danger)
#fecaca                        -> var(--color-ms-text-danger-soft)
#d1fae5                        -> var(--color-ms-text-success-soft)
rgba(255, 111, 145, 0.88)     -> var(--color-ms-danger-alpha-88)
rgba(239, 68, 68, 0.12)       -> var(--color-ms-danger-alpha-12)
rgba(239, 68, 68, 0.18)       -> var(--color-ms-danger-alpha-18)
rgba(35, 199, 139, 0.08)      -> var(--color-ms-primary-alpha-08)
rgba(35, 199, 139, 0.11)      -> var(--color-ms-primary-alpha-11)
rgba(35, 199, 139, 0.14)      -> var(--color-ms-primary-alpha-14)
rgba(35, 199, 139, 0.18)      -> var(--color-ms-primary-alpha-18)
```

- [ ] **Step 5: Preserve dynamic data variables**

Do not replace these variable flows:

```css
--category-color
--tag-color
--account-color
--operation-color
```

They are allowed dynamic data colors. Their supporting surfaces and text must still be built with `color-mix(...)` against those variables.

- [ ] **Step 6: Build after CSS conversion**

Run:

```bash
npm run build
```

Expected: PASS. If a component style budget fails because CSS grew past `8kB`, reduce duplicated token references or split repeated local CSS only in the touched component.

- [ ] **Step 7: Commit this task**

Run:

```bash
git add src/styles.css src/app/**/*.css
git commit -m "style: reuse global color tokens in components"
```

---

### Task 7: Final Color Literal Audit And Verification

**Files:**
- Modify: any `src/app/**/*.spec.ts` file reported by the audit when it duplicates fallback literals that must import shared constants.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run the final literal search**

Run:

```bash
rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" src -g "*.css" -g "*.ts" -g "*.html"
```

Expected remaining literals only in:

```text
src/styles.css
src/app/shared/theme/theme-colors.ts
*.spec.ts fixtures that model API/user-selected colors
CSS declarations using dynamic data color variables
browser autofill workaround tokens already defined in src/styles.css
```

- [ ] **Step 4: Inspect any unexpected matches**

For each unexpected non-test, non-token match, either replace it with a global token or add the missing global token in `src/styles.css` and reuse it. Do not leave local UI literals in feature/shared component CSS or Chart.js configuration.

- [ ] **Step 5: Capture git status**

Run:

```bash
git status --short
```

Expected: only intended color-system changes are modified. Existing unrelated dirty files from before this work may remain; do not revert them.

- [ ] **Step 6: Commit final cleanup**

Run:

```bash
git add src docs/superpowers/plans/2026-06-11-global-color-system.md
git commit -m "refactor: centralize color usage"
```

---

## Self-Review Notes

- Spec coverage: global CSS tokens are covered by Tasks 3 and 6; shared TS theme by Tasks 1, 2, 4, and 5; API/user data color boundary by Tasks 5, 6, and 7; verification by Task 7.
- Placeholder scan: no placeholder steps; each task contains exact files, commands, and concrete snippets or replacement tables.
- Type consistency: shared exports are `MS_ACCOUNT_COLORS`, `MS_CATEGORY_COLORS`, `MS_CHART_THEME`, and `readThemeColor()` throughout the plan.
