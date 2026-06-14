# Tag Analytics Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Analytics Tags view so users can understand tag spending by total, monthly trend, and category composition.

**Architecture:** Compute tag analytics from existing frontend data in pure utilities, wire the computed data through `HomeDashboardStore` and `HomePageComponent`, then shape it into `ms-chart-card` datasets in `AnalyticsTabComponent`. Keep Chart.js encapsulated in the existing chart card and test the data contracts instead of canvas rendering.

**Tech Stack:** Angular 21 standalone components, Angular signals/computed, Vitest via `ng test`, Chart.js through the existing `ms-chart-card` component.

---

## File Structure

- Modify `src/app/features/home/ui/home-page.models.ts`
  - Add frontend-only tag analytics interfaces.
- Create `src/app/features/home/ui/home-tag-analytics.utils.ts`
  - Pure calculation helpers for monthly tag series and tag category composition.
- Create `src/app/features/home/ui/home-tag-analytics.utils.spec.ts`
  - TDD coverage for the new calculation helpers.
- Modify `src/app/features/home/ui/home-dashboard.store.ts`
  - Compute the new tag analytics from selected-year transactions and tag groups.
- Modify `src/app/features/home/ui/home-page.component.ts`
  - Expose the new store computeds to the template.
- Modify `src/app/features/home/ui/home-page.component.html`
  - Pass the new analytics inputs into `ms-analytics-tab`.
- Modify `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.ts`
  - Add pure helper functions for selecting tag trend series and tag composition.
- Modify `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.spec.ts`
  - TDD coverage for the new chart shaping helpers.
- Modify `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts`
  - Add inputs and computeds for monthly trend and composition charts.
- Modify `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.html`
  - Render the two new chart cards in the Tags view.
- Modify `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts`
  - Component-level coverage for rendered Tags chart cards and selected tag behavior.
- Delete `docs/superpowers/specs/2026-06-13-tag-analytics-depth-design.md`
  - Commit this deletion separately per user request after the plan is saved.

---

### Task 1: Add Tag Analytics Models And Calculation Utility

**Files:**
- Modify: `src/app/features/home/ui/home-page.models.ts`
- Create: `src/app/features/home/ui/home-tag-analytics.utils.ts`
- Test: `src/app/features/home/ui/home-tag-analytics.utils.spec.ts`

- [ ] **Step 1: Write the failing utility tests**

Create `src/app/features/home/ui/home-tag-analytics.utils.spec.ts`:

```typescript
import { TransactionResponse } from '../data-access/home-api.models';
import { TagGroupItem } from './home-page.models';
import {
    buildTagCategoryCompositions,
    buildTagMonthlyExpenseSeries,
} from './home-tag-analytics.utils';

describe('home tag analytics utils', () => {
    const months = [new Date(2026, 0, 1), new Date(2026, 1, 1), new Date(2026, 2, 1)];
    const tags: ReadonlyArray<TagGroupItem> = [
        {
            id: 'home-tag',
            name: 'Дом',
            color: '#67a6c1',
            categories: [
                { id: 'rent', name: 'Аренда', color: '#23c78b', type: 'expense' },
                { id: 'food', name: 'Еда', color: '#ff6f91', type: 'expense' },
                { id: 'salary', name: 'Зарплата', color: '#e8b45d', type: 'income' },
            ],
        },
        {
            id: 'transport-tag',
            name: 'Транспорт',
            color: '#e8b45d',
            categories: [{ id: 'taxi', name: 'Такси', color: '#c77dff', type: 'expense' }],
        },
    ];

    it('builds sorted monthly expense series for expense categories assigned to tags', () => {
        const series = buildTagMonthlyExpenseSeries(
            tags,
            [
                transaction('rent-jan', 'rent', 'Debit', -100, '2026-01-08T12:00:00'),
                transaction('food-feb', 'food', 'Debit', -30, '2026-02-12T12:00:00'),
                transaction('salary-feb', 'salary', 'Credit', 900, '2026-02-01T12:00:00'),
                transaction('taxi-mar', 'taxi', 'Debit', -45, '2026-03-03T12:00:00'),
            ],
            months,
            (item) => Math.abs(item.amount),
        );

        expect(series.map((item) => item.id)).toEqual(['home-tag', 'transport-tag']);
        expect(series[0]).toMatchObject({
            id: 'home-tag',
            name: 'Дом',
            color: '#67a6c1',
            totalValue: 130,
        });
        expect(series[0].points).toEqual([
            { label: 'янв.', value: 100 },
            { label: 'февр.', value: 30 },
            { label: 'март', value: 0 },
        ]);
        expect(series[1].points.map((point) => point.value)).toEqual([0, 0, 45]);
    });

    it('builds category composition for each tag and ignores income categories', () => {
        const compositions = buildTagCategoryCompositions(
            tags,
            [
                transaction('rent-jan', 'rent', 'Debit', -100, '2026-01-08T12:00:00'),
                transaction('food-feb', 'food', 'Debit', -30, '2026-02-12T12:00:00'),
                transaction('salary-feb', 'salary', 'Credit', 900, '2026-02-01T12:00:00'),
                transaction('taxi-mar', 'taxi', 'Debit', -45, '2026-03-03T12:00:00'),
            ],
            (item) => Math.abs(item.amount),
            'BYN',
        );

        expect(compositions).toHaveLength(2);
        expect(compositions[0]).toMatchObject({
            tagId: 'home-tag',
            tagName: 'Дом',
            tagColor: '#67a6c1',
        });
        expect(compositions[0].categories.map((item) => item.id)).toEqual(['rent', 'food']);
        expect(compositions[0].categories.map((item) => item.amountValue)).toEqual([100, 30]);
        expect(compositions[0].categories[0].amount).toContain('100');
    });
});

function transaction(
    id: string,
    categoryId: string,
    categoryType: 'Debit' | 'Credit',
    amount: number,
    date: string,
): TransactionResponse {
    return {
        id,
        amount,
        date,
        description: '',
        account: {
            id: 'account-id',
            name: 'Основной',
            color: '#23c78b',
            currencyCode: 'BYN',
            isArchived: false,
        },
        category: {
            id: categoryId,
            name: categoryId,
            type: categoryType,
            color: '#23c78b',
        },
    };
}
```

- [ ] **Step 2: Run the utility test to verify it fails**

Run:

```bash
npx ng test --include src/app/features/home/ui/home-tag-analytics.utils.spec.ts
```

Expected: FAIL because `home-tag-analytics.utils.ts`, `buildTagMonthlyExpenseSeries`, and `buildTagCategoryCompositions` do not exist yet.

- [ ] **Step 3: Add the new tag analytics model interfaces**

In `src/app/features/home/ui/home-page.models.ts`, add these interfaces after `AnalyticsSeriesPoint`:

```typescript
export interface TagMonthlyExpenseSeries {
    id: string;
    name: string;
    color: string;
    totalValue: number;
    points: ReadonlyArray<AnalyticsSeriesPoint>;
}

export interface TagCategoryComposition {
    tagId: string;
    tagName: string;
    tagColor: string;
    categories: ReadonlyArray<CategoryBreakdownItem>;
}
```

- [ ] **Step 4: Add the minimal utility implementation**

Create `src/app/features/home/ui/home-tag-analytics.utils.ts`:

```typescript
import { TransactionResponse } from '../data-access/home-api.models';
import {
    CategoryBreakdownItem,
    TagCategoryComposition,
    TagGroupItem,
    TagMonthlyExpenseSeries,
} from './home-page.models';
import { compactMonthLabel, monthKey } from './home-date.utils';
import { formatMoney } from './home-formatters';

export function buildTagMonthlyExpenseSeries(
    tags: ReadonlyArray<TagGroupItem>,
    transactions: ReadonlyArray<TransactionResponse>,
    months: ReadonlyArray<Date>,
    readAmount: (transaction: TransactionResponse) => number,
): TagMonthlyExpenseSeries[] {
    const monthKeys = months.map((month) => monthKey(month));

    return tags
        .map((tag) => {
            const expenseCategoryIds = new Set(
                tag.categories
                    .filter((category) => category.type === 'expense')
                    .map((category) => category.id),
            );
            const points = monthKeys.map((key, index) => {
                const value = transactions
                    .filter((transaction) => expenseCategoryIds.has(transaction.category.id))
                    .filter((transaction) => monthKey(new Date(transaction.date)) === key)
                    .reduce((sum, transaction) => sum + readAmount(transaction), 0);

                return {
                    label: compactMonthLabel(months[index]),
                    value,
                };
            });
            const totalValue = points.reduce((sum, point) => sum + point.value, 0);

            return {
                id: tag.id,
                name: tag.name,
                color: tag.color,
                totalValue,
                points,
            };
        })
        .filter((item) => item.totalValue > 0)
        .sort((left, right) => right.totalValue - left.totalValue);
}

export function buildTagCategoryCompositions(
    tags: ReadonlyArray<TagGroupItem>,
    transactions: ReadonlyArray<TransactionResponse>,
    readAmount: (transaction: TransactionResponse) => number,
    currencyCode: string,
): TagCategoryComposition[] {
    return tags
        .map((tag) => buildTagCategoryComposition(tag, transactions, readAmount, currencyCode))
        .filter((composition) => composition.categories.length > 0);
}

function buildTagCategoryComposition(
    tag: TagGroupItem,
    transactions: ReadonlyArray<TransactionResponse>,
    readAmount: (transaction: TransactionResponse) => number,
    currencyCode: string,
): TagCategoryComposition {
    const categories = tag.categories
        .filter((category) => category.type === 'expense')
        .map<CategoryBreakdownItem>((category) => {
            const amountValue = transactions
                .filter((transaction) => transaction.category.id === category.id)
                .reduce((sum, transaction) => sum + readAmount(transaction), 0);

            return {
                id: category.id,
                name: category.name,
                amount: formatMoney(amountValue, currencyCode),
                amountValue,
                progress: 0,
                color: category.color,
                type: 'expense',
                tone: 'warning',
                isSystem: false,
            };
        })
        .filter((item) => item.amountValue > 0)
        .sort((left, right) => right.amountValue - left.amountValue);
    const max = Math.max(1, ...categories.map((category) => category.amountValue));

    return {
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        categories: categories.map((category) => ({
            ...category,
            progress: Math.round((category.amountValue / max) * 100),
        })),
    };
}
```

- [ ] **Step 5: Run the utility test to verify it passes**

Run:

```bash
npx ng test --include src/app/features/home/ui/home-tag-analytics.utils.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add src/app/features/home/ui/home-page.models.ts src/app/features/home/ui/home-tag-analytics.utils.ts src/app/features/home/ui/home-tag-analytics.utils.spec.ts
git commit -m "feat: calculate tag analytics data"
```

---

### Task 2: Wire Tag Analytics Through The Dashboard And Page

**Files:**
- Modify: `src/app/features/home/ui/home-dashboard.store.ts`
- Modify: `src/app/features/home/ui/home-page.component.ts`
- Modify: `src/app/features/home/ui/home-page.component.html`

- [ ] **Step 1: Write the failing store/page wiring expectation**

In `src/app/features/home/ui/home-page.component.spec.ts`, add this test near the analytics-related tests:

```typescript
it('passes deeper tag analytics data into the analytics tab', () => {
    fixture.detectChanges();

    const analyticsTab = fixture.nativeElement.querySelector('ms-analytics-tab') as HTMLElement | null;

    fixture.componentInstance.setActiveTab('analytics');
    fixture.detectChanges();

    expect(fixture.componentInstance.tagMonthlyExpensesChart()).toEqual([]);
    expect(fixture.componentInstance.tagCategoryCompositions()).toEqual([]);
    expect(analyticsTab).toBeNull();
});
```

Then adjust the final assertions during implementation in Step 4 after the template exposes the inputs. The first red run proves the component API does not exist.

- [ ] **Step 2: Run the focused page test to verify it fails**

Run:

```bash
npx ng test --include src/app/features/home/ui/home-page.component.spec.ts
```

Expected: FAIL with TypeScript errors because `tagMonthlyExpensesChart` and `tagCategoryCompositions` do not exist on `HomePageComponent`.

- [ ] **Step 3: Add dashboard computed properties**

In `src/app/features/home/ui/home-dashboard.store.ts`, extend the models import:

```typescript
    TagCategoryComposition,
    TagMonthlyExpenseSeries,
```

Add this import beside other local utilities:

```typescript
import {
    buildTagCategoryCompositions,
    buildTagMonthlyExpenseSeries,
} from './home-tag-analytics.utils';
```

Add these computeds after `tagExpensesChart`:

```typescript
    readonly tagMonthlyExpensesChart = computed<ReadonlyArray<TagMonthlyExpenseSeries>>(() =>
        buildTagMonthlyExpenseSeries(
            this.tagGroups(),
            this.selectedYearTransactions().filter((transaction) =>
                isExpenseCategory(transaction.category.type),
            ),
            this.monthsForSelectedYear(),
            (transaction) => Math.abs(this.convertTransactionAmount(transaction)),
        ),
    );
    readonly tagCategoryCompositions = computed<ReadonlyArray<TagCategoryComposition>>(() =>
        buildTagCategoryCompositions(
            this.tagGroups(),
            this.selectedYearTransactions().filter((transaction) =>
                isExpenseCategory(transaction.category.type),
            ),
            (transaction) => Math.abs(this.convertTransactionAmount(transaction)),
            this.applicationCurrencyCode(),
        ),
    );
```

- [ ] **Step 4: Expose the computeds in HomePageComponent**

In `src/app/features/home/ui/home-page.component.ts`, add these readonly fields after `tagExpensesChart`:

```typescript
    readonly tagMonthlyExpensesChart = this.dashboard.tagMonthlyExpensesChart;
    readonly tagCategoryCompositions = this.dashboard.tagCategoryCompositions;
```

- [ ] **Step 5: Pass the computeds into the analytics tab**

In `src/app/features/home/ui/home-page.component.html`, add these inputs directly after `[tagExpenses]="tagExpensesChart()"`:

```html
                                    [tagMonthlyExpenses]="tagMonthlyExpensesChart()"
                                    [tagCategoryCompositions]="tagCategoryCompositions()"
```

- [ ] **Step 6: Replace the temporary page test with stable assertions**

Replace the test from Step 1 with:

```typescript
it('exposes deeper tag analytics data for the analytics tab', () => {
    expect(fixture.componentInstance.tagMonthlyExpensesChart()).toEqual([]);
    expect(fixture.componentInstance.tagCategoryCompositions()).toEqual([]);
});
```

- [ ] **Step 7: Run the focused page test to verify it passes**

Run:

```bash
npx ng test --include src/app/features/home/ui/home-page.component.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

Run:

```bash
git add src/app/features/home/ui/home-dashboard.store.ts src/app/features/home/ui/home-page.component.ts src/app/features/home/ui/home-page.component.html src/app/features/home/ui/home-page.component.spec.ts
git commit -m "feat: wire tag analytics data"
```

---

### Task 3: Add Analytics Tab Helper Functions For Tag Trend And Composition

**Files:**
- Modify: `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.ts`
- Modify: `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.spec.ts`

- [ ] **Step 1: Write failing helper tests**

In `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.spec.ts`, extend the imports:

```typescript
    buildTagMonthlyDatasets,
    selectTagComposition,
    selectTagMonthlySeries,
```

Add these tests:

```typescript
it('selects top monthly tag series for all tags and a single series for a selected tag', () => {
    const series = [
        monthlySeries('home-tag', 'Дом', '#67a6c1', 130, [100, 30]),
        monthlySeries('transport-tag', 'Транспорт', '#e8b45d', 45, [0, 45]),
        monthlySeries('health-tag', 'Здоровье', '#23c78b', 20, [20, 0]),
    ];

    expect(selectTagMonthlySeries(series, 'all', '2').map((item) => item.id)).toEqual([
        'home-tag',
        'transport-tag',
    ]);
    expect(selectTagMonthlySeries(series, 'transport-tag', '2').map((item) => item.id)).toEqual([
        'transport-tag',
    ]);
    expect(selectTagMonthlySeries(series, 'all', 'all')).toHaveLength(3);
});

it('builds one line dataset per selected monthly tag series', () => {
    expect(
        buildTagMonthlyDatasets([
            monthlySeries('home-tag', 'Дом', '#67a6c1', 130, [100, 30]),
            monthlySeries('transport-tag', 'Транспорт', '#e8b45d', 45, [0, 45]),
        ]),
    ).toEqual([
        { label: 'Дом', data: [100, 30], color: '#67a6c1', fill: false },
        { label: 'Транспорт', data: [0, 45], color: '#e8b45d', fill: false },
    ]);
});

it('selects composition for the selected tag or the top visible tag in all-tags mode', () => {
    const compositions = [
        composition('home-tag', 'Дом', [category('rent', 'Аренда', 100, '#23c78b')]),
        composition('transport-tag', 'Транспорт', [category('taxi', 'Такси', 45, '#e8b45d')]),
    ];
    const visibleTagExpenses = [
        category('transport-tag', 'Транспорт', 45, '#e8b45d'),
        category('home-tag', 'Дом', 100, '#67a6c1'),
    ];

    expect(selectTagComposition(compositions, visibleTagExpenses, 'all')?.tagId).toBe(
        'transport-tag',
    );
    expect(selectTagComposition(compositions, visibleTagExpenses, 'home-tag')?.tagId).toBe(
        'home-tag',
    );
});
```

Add these local factories at the bottom of the spec:

```typescript
function monthlySeries(
    id: string,
    name: string,
    color: string,
    totalValue: number,
    values: ReadonlyArray<number>,
) {
    return {
        id,
        name,
        color,
        totalValue,
        points: values.map((value, index) => ({
            label: index === 0 ? 'янв.' : 'февр.',
            value,
        })),
    };
}

function composition(id: string, name: string, categories: ReturnType<typeof category>[]) {
    return {
        tagId: id,
        tagName: name,
        tagColor: '#67a6c1',
        categories,
    };
}
```

- [ ] **Step 2: Run helper tests to verify they fail**

Run:

```bash
npx ng test --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.spec.ts
```

Expected: FAIL because the imported helper functions do not exist.

- [ ] **Step 3: Implement helper functions**

In `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.ts`, extend the model import:

```typescript
    TagCategoryComposition,
    TagMonthlyExpenseSeries,
```

Add these functions after `selectLimitedBreakdownItems`:

```typescript
export function selectTagMonthlySeries(
    series: ReadonlyArray<TagMonthlyExpenseSeries>,
    selectedTagId: string,
    limit: AnalyticsTagChartLimit,
): TagMonthlyExpenseSeries[] {
    const sorted = [...series].sort((left, right) => right.totalValue - left.totalValue);

    if (selectedTagId !== 'all') {
        return sorted.filter((item) => item.id === selectedTagId);
    }

    return limit === 'all' ? sorted : sorted.slice(0, Number(limit));
}

export function buildTagMonthlyDatasets(
    series: ReadonlyArray<TagMonthlyExpenseSeries>,
): ReadonlyArray<HomeChartDataset> {
    return series.map((item) => ({
        label: item.name,
        data: item.points.map((point) => point.value),
        color: item.color,
        fill: false,
    }));
}

export function selectTagComposition(
    compositions: ReadonlyArray<TagCategoryComposition>,
    visibleTagExpenses: ReadonlyArray<CategoryBreakdownItem>,
    selectedTagId: string,
): TagCategoryComposition | undefined {
    if (selectedTagId !== 'all') {
        return compositions.find((composition) => composition.tagId === selectedTagId);
    }

    const visibleTagIds = new Set(visibleTagExpenses.map((item) => item.id));

    return (
        compositions.find((composition) => visibleTagIds.has(composition.tagId)) ??
        compositions[0]
    );
}
```

- [ ] **Step 4: Run helper tests to verify they pass**

Run:

```bash
npx ng test --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.ts src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.spec.ts
git commit -m "feat: shape tag analytics chart data"
```

---

### Task 4: Add Analytics Tab Computeds And Component Tests

**Files:**
- Modify: `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts`
- Modify: `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts`

- [ ] **Step 1: Write failing component tests**

In `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts`, update `beforeEach` to set the required inputs that will be added:

```typescript
        fixture.componentRef.setInput('tagMonthlyExpenses', []);
        fixture.componentRef.setInput('tagCategoryCompositions', []);
```

Add these tests:

```typescript
it('builds monthly tag trend datasets for all visible tags', () => {
    fixture.componentRef.setInput('tagMonthlyExpenses', [
        monthlySeries('home-tag', 'Дом', '#67a6c1', 130, [100, 30]),
        monthlySeries('transport-tag', 'Транспорт', '#e8b45d', 45, [0, 45]),
    ]);

    expect(component.tagMonthlyExpenseLabels()).toEqual(['янв.', 'февр.']);
    expect(component.tagMonthlyExpenseDatasets()).toEqual([
        { label: 'Дом', data: [100, 30], color: '#67a6c1', fill: false },
        { label: 'Транспорт', data: [0, 45], color: '#e8b45d', fill: false },
    ]);
});

it('narrows monthly trend and composition to the selected tag', () => {
    fixture.componentRef.setInput('tagMonthlyExpenses', [
        monthlySeries('home-tag', 'Дом', '#67a6c1', 130, [100, 30]),
        monthlySeries('transport-tag', 'Транспорт', '#e8b45d', 45, [0, 45]),
    ]);
    fixture.componentRef.setInput('tagCategoryCompositions', [
        composition('home-tag', 'Дом', [category('rent', 'Аренда', 100, '#23c78b')]),
        composition('transport-tag', 'Транспорт', [category('taxi', 'Такси', 45, '#e8b45d')]),
    ]);

    component.selectedTagExpenseId.set('transport-tag');

    expect(component.tagMonthlyExpenseDatasets()).toEqual([
        { label: 'Транспорт', data: [0, 45], color: '#e8b45d', fill: false },
    ]);
    expect(component.tagCompositionLabels()).toEqual(['Такси']);
    expect(component.tagCompositionDatasets()[0].data).toEqual([45]);
    expect(component.tagCompositionTitle()).toBe('Состав тега: Транспорт');
});

it('uses the top visible tag composition when all tags are selected', () => {
    fixture.componentRef.setInput('tagExpenses', [
        category('home-tag', 'Дом', 130, '#67a6c1'),
        category('transport-tag', 'Транспорт', 45, '#e8b45d'),
    ]);
    fixture.componentRef.setInput('tagCategoryCompositions', [
        composition('home-tag', 'Дом', [category('rent', 'Аренда', 100, '#23c78b')]),
        composition('transport-tag', 'Транспорт', [category('taxi', 'Такси', 45, '#e8b45d')]),
    ]);

    expect(component.tagCompositionLabels()).toEqual(['Аренда']);
    expect(component.tagCompositionTitle()).toBe('Состав тега: Дом');
});
```

Add these factories near the existing factories:

```typescript
function monthlySeries(
    id: string,
    name: string,
    color: string,
    totalValue: number,
    values: ReadonlyArray<number>,
) {
    return {
        id,
        name,
        color,
        totalValue,
        points: values.map((value, index) => ({
            label: index === 0 ? 'янв.' : 'февр.',
            value,
        })),
    };
}

function composition(id: string, name: string, categories: ReturnType<typeof category>[]) {
    return {
        tagId: id,
        tagName: name,
        tagColor: '#67a6c1',
        categories,
    };
}
```

- [ ] **Step 2: Run component tests to verify they fail**

Run:

```bash
npx ng test --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
```

Expected: FAIL because the new inputs and computeds do not exist.

- [ ] **Step 3: Add inputs, imports, and computeds**

In `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts`, extend the model import:

```typescript
    TagCategoryComposition,
    TagMonthlyExpenseSeries,
```

Extend the helper import:

```typescript
    buildTagMonthlyDatasets,
    selectTagComposition,
    selectTagMonthlySeries,
```

Add these inputs after `tagExpenses`:

```typescript
    tagMonthlyExpenses = input.required<ReadonlyArray<TagMonthlyExpenseSeries>>();
    tagCategoryCompositions = input.required<ReadonlyArray<TagCategoryComposition>>();
```

Add these computeds after `tagExpenseDatasets`:

```typescript
    readonly visibleTagMonthlyExpenses = computed(() =>
        selectTagMonthlySeries(
            this.tagMonthlyExpenses(),
            this.selectedTagExpenseId(),
            this.tagChartLimit(),
        ),
    );
    readonly tagMonthlyExpenseLabels = computed(() =>
        chartLabels(this.visibleTagMonthlyExpenses()[0]?.points ?? []),
    );
    readonly tagMonthlyExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildTagMonthlyDatasets(this.visibleTagMonthlyExpenses()),
    );
    readonly selectedTagComposition = computed(() =>
        selectTagComposition(
            this.tagCategoryCompositions(),
            this.visibleTagExpenses(),
            this.selectedTagExpenseId(),
        ),
    );
    readonly tagCompositionLabels = computed(() =>
        breakdownLabels(this.selectedTagComposition()?.categories ?? []),
    );
    readonly tagCompositionDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildBreakdownDataset(
            'Категории тега',
            this.selectedTagComposition()?.categories ?? [],
            MS_ANALYTICS_CHART_COLORS.tags,
            MS_CATEGORY_COLORS,
        ),
    );
    readonly tagCompositionTitle = computed(() => {
        const composition = this.selectedTagComposition();

        return composition ? `Состав тега: ${composition.tagName}` : 'Состав тега';
    });
```

- [ ] **Step 4: Run component tests to verify they pass**

Run:

```bash
npx ng test --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
git commit -m "feat: prepare tag analytics charts"
```

---

### Task 5: Render The New Tags View Charts

**Files:**
- Modify: `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.html`
- Modify: `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts`

- [ ] **Step 1: Write a failing render test**

In `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts`, add:

```typescript
it('renders overview, trend, and composition charts in the tags view', () => {
    fixture.componentRef.setInput('tagExpenses', [
        category('home-tag', 'Дом', 130, '#67a6c1'),
    ]);
    fixture.componentRef.setInput('tagMonthlyExpenses', [
        monthlySeries('home-tag', 'Дом', '#67a6c1', 130, [100, 30]),
    ]);
    fixture.componentRef.setInput('tagCategoryCompositions', [
        composition('home-tag', 'Дом', [category('rent', 'Аренда', 100, '#23c78b')]),
    ]);
    component.activeView.set('tags');

    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const chartCards = host.querySelectorAll('.tag-chart-section ms-chart-card');

    expect(chartCards).toHaveLength(3);
    expect(host.textContent ?? '').toContain('Расходы по тегам');
    expect(host.textContent ?? '').toContain('Динамика по месяцам');
    expect(host.textContent ?? '').toContain('Состав тега: Дом');
});
```

- [ ] **Step 2: Run component tests to verify the render test fails**

Run:

```bash
npx ng test --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
```

Expected: FAIL because only one chart card is rendered in the Tags view.

- [ ] **Step 3: Add the new chart cards to the Tags template**

In `src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.html`, add these cards after the existing "Расходы по тегам" `ms-chart-card` and before the tag filter strip:

```html
                <ms-chart-card
                    title="Динамика по месяцам"
                    subtitle="Как менялись расходы выбранных тегов в течение года."
                    type="line"
                    [labels]="tagMonthlyExpenseLabels()"
                    [datasets]="tagMonthlyExpenseDatasets()"
                    [height]="280"
                ></ms-chart-card>

                <ms-chart-card
                    [title]="tagCompositionTitle()"
                    subtitle="Категории, которые формируют расходы выбранного тега."
                    type="doughnut"
                    [labels]="tagCompositionLabels()"
                    [datasets]="tagCompositionDatasets()"
                    [height]="280"
                ></ms-chart-card>
```

- [ ] **Step 4: Run component tests to verify they pass**

Run:

```bash
npx ng test --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.html src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
git commit -m "feat: render deeper tag analytics charts"
```

---

### Task 6: Run Focused And Full Verification

**Files:**
- No file edits expected.

- [ ] **Step 1: Run focused tests for changed areas**

Run:

```bash
npx ng test --include src/app/features/home/ui/home-tag-analytics.utils.spec.ts --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.spec.ts --include src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts --include src/app/features/home/ui/home-page.component.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS, with no Angular template type errors.

- [ ] **Step 3: Run style budget verification**

Run:

```bash
npm run test:style-budgets
```

Expected: PASS.

- [ ] **Step 4: Inspect final diff for scope**

Run:

```bash
git diff -- src/app/features/home/ui/home-page.models.ts src/app/features/home/ui/home-tag-analytics.utils.ts src/app/features/home/ui/home-tag-analytics.utils.spec.ts src/app/features/home/ui/home-dashboard.store.ts src/app/features/home/ui/home-page.component.ts src/app/features/home/ui/home-page.component.html src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.ts src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.helpers.spec.ts src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.ts src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.html src/app/features/home/ui/tab-panels/analytics-tab/analytics-tab.component.spec.ts
```

Expected: Diff only contains the tag analytics changes from this plan.

---

### Task 7: Delete The Design Spec And Commit The Deletion

**Files:**
- Delete: `docs/superpowers/specs/2026-06-13-tag-analytics-depth-design.md`

- [ ] **Step 1: Delete the approved design spec**

Run:

```bash
Remove-Item -LiteralPath docs/superpowers/specs/2026-06-13-tag-analytics-depth-design.md
```

Expected: The file is removed from the working tree.

- [ ] **Step 2: Confirm only the spec deletion is staged for this cleanup commit**

Run:

```bash
git status --short -- docs/superpowers/specs/2026-06-13-tag-analytics-depth-design.md
```

Expected:

```text
 D docs/superpowers/specs/2026-06-13-tag-analytics-depth-design.md
```

- [ ] **Step 3: Commit the deletion**

Run:

```bash
git add -- docs/superpowers/specs/2026-06-13-tag-analytics-depth-design.md
git commit -m "docs: remove tag analytics design spec"
```

Expected: A commit that deletes only `docs/superpowers/specs/2026-06-13-tag-analytics-depth-design.md`.

---

## Self-Review

- Spec coverage:
  - Three chart cards in the Tags view are covered by Tasks 4 and 5.
  - Existing overview chart, type selector, limit selector, and chips remain in place in Tasks 4 and 5.
  - Monthly tag trend is covered by Tasks 1, 3, 4, and 5.
  - Selected tag category composition is covered by Tasks 1, 3, 4, and 5.
  - Current account/year transaction scope is covered by Task 2 through `selectedYearTransactions()` and `monthsForSelectedYear()`.
  - No new API and no new chart library are introduced.
  - User-requested spec deletion is covered by Task 7.
- Placeholder scan:
  - No unfinished placeholder markers are intentionally left.
- Type consistency:
  - `TagMonthlyExpenseSeries`, `TagCategoryComposition`, `tagMonthlyExpensesChart`, `tagCategoryCompositions`, `tagMonthlyExpenseDatasets`, and `tagCompositionDatasets` are named consistently across tasks.
