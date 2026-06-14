export const MS_ACCOUNT_COLORS: ReadonlyArray<string> = [
    '#23c78b',
    '#ffd166',
    '#67a6c1',
    '#ff8fab',
    '#c77dff',
];

export const MS_CATEGORY_COLORS: ReadonlyArray<string> = [
    '#23c78b',
    '#67a6c1',
    '#ff6f91',
    '#e8b45d',
    '#c77dff',
    '#79e0b5',
];

export const MS_CATEGORY_OTHER_COLOR = '#8fa39a';

export const MS_ANALYTICS_CHART_COLORS = {
    income: MS_CATEGORY_COLORS[0],
    expense: MS_CATEGORY_COLORS[2],
    balance: MS_CATEGORY_COLORS[1],
    savings: MS_CATEGORY_COLORS[3],
    tags: MS_CATEGORY_COLORS[0],
    topExpenses: MS_CATEGORY_COLORS[3],
    other: MS_CATEGORY_OTHER_COLOR,
} as const;

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

export const MS_CHART_FALLBACK_COLORS = {
    tooltipBackground: '#0e1512',
    tooltipTitle: '#ffffff',
    tooltipBody: 'rgba(255, 255, 255, 0.78)',
    tooltipBorder: 'rgba(35, 199, 139, 0.18)',
    legendText: 'rgba(255, 255, 255, 0.72)',
    axisText: 'rgba(255, 255, 255, 0.44)',
    axisSubtleText: 'rgba(255, 255, 255, 0.38)',
    gridLine: 'rgba(255, 255, 255, 0.06)',
    fallbackSeries: MS_CATEGORY_COLORS[0],
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
