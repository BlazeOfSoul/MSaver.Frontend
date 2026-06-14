import {
    AnalyticsSeriesPoint,
    AnalyticsStackedPoint,
    CategoryBreakdownItem,
    HomeChartDataset,
} from '../../home-page.models';

export type AnalyticsTagChartLimit = `${number}` | 'all';

interface LimitBreakdownOptions {
    otherLabel: string;
    otherColor: string;
    maxItems?: number;
}

export function chartLabels<T extends { label: string }>(items: ReadonlyArray<T>): string[] {
    return items.map((item) => item.label);
}

export function breakdownLabels(items: ReadonlyArray<CategoryBreakdownItem>): string[] {
    return items.map((item) => item.name);
}

export function limitBreakdownItems(
    items: ReadonlyArray<CategoryBreakdownItem>,
    { otherLabel, otherColor, maxItems = 10 }: LimitBreakdownOptions,
): CategoryBreakdownItem[] {
    const sorted = [...items].sort((left, right) => right.amountValue - left.amountValue);

    if (sorted.length <= maxItems) {
        return sorted;
    }

    const visibleCount = Math.max(1, maxItems - 1);
    const visible = sorted.slice(0, visibleCount);
    const rest = sorted.slice(visibleCount);
    const amountValue = rest.reduce((sum, item) => sum + item.amountValue, 0);

    return [
        ...visible,
        {
            id: 'other',
            name: otherLabel,
            amount: '',
            amountValue,
            progress: 0,
            color: otherColor,
            type: visible[0]?.type ?? 'expense',
            tone: 'warning',
            isSystem: false,
        },
    ];
}

export function buildBreakdownDataset(
    label: string,
    items: ReadonlyArray<CategoryBreakdownItem>,
    color: string,
    fallbackColors: ReadonlyArray<string>,
): ReadonlyArray<HomeChartDataset> {
    return [
        {
            label,
            data: items.map((item) => item.amountValue),
            color,
            colors: items.map(
                (item, index) => item.color || pickFallbackColor(index, fallbackColors, color),
            ),
        },
    ];
}

export function buildValueDataset(
    label: string,
    items: ReadonlyArray<AnalyticsSeriesPoint>,
    color: string,
    fill = false,
): ReadonlyArray<HomeChartDataset> {
    return [
        {
            label,
            data: items.map((item) => item.value),
            color,
            ...(fill ? { fill: true } : {}),
        },
    ];
}

export function buildStackedIncomeExpenseDatasets(
    items: ReadonlyArray<AnalyticsStackedPoint>,
    labels: { income: string; expense: string },
    colors: { income: string; expense: string },
): ReadonlyArray<HomeChartDataset> {
    return [
        {
            label: labels.income,
            data: items.map((item) => item.income),
            color: colors.income,
        },
        {
            label: labels.expense,
            data: items.map((item) => item.expense),
            color: colors.expense,
        },
    ];
}

export function buildNetCashFlowDataset(
    items: ReadonlyArray<AnalyticsStackedPoint>,
    label: string,
    color: string,
): ReadonlyArray<HomeChartDataset> {
    return [
        {
            label,
            data: items.map((item) => item.income - item.expense),
            color,
            fill: true,
        },
    ];
}

export function selectLimitedBreakdownItems(
    items: ReadonlyArray<CategoryBreakdownItem>,
    selectedItemId: string,
    limit: AnalyticsTagChartLimit,
): CategoryBreakdownItem[] {
    const selected = [...items]
        .sort((left, right) => right.amountValue - left.amountValue)
        .filter((item) => selectedItemId === 'all' || item.id === selectedItemId);

    return limit === 'all' ? selected : selected.slice(0, Number(limit));
}

export function isTagChartLimit(value: string): value is AnalyticsTagChartLimit {
    return value === 'all' || /^\d+$/.test(value);
}

function pickFallbackColor(
    index: number,
    fallbackColors: ReadonlyArray<string>,
    defaultColor: string,
): string {
    return fallbackColors[index % fallbackColors.length] ?? defaultColor;
}
