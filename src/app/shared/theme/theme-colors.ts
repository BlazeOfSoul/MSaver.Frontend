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
