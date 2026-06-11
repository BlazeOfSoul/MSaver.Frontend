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
        expect(MS_CATEGORY_COLORS).toEqual([
            '#23c78b',
            '#67a6c1',
            '#ff6f91',
            '#e8b45d',
            '#c77dff',
            '#79e0b5',
        ]);
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

        expect(readThemeColor('--color-ms-chart-axis-text', '#fff', root)).toBe(
            'rgba(255, 255, 255, 0.44)',
        );
    });

    it('returns the fallback when the CSS variable is missing', () => {
        const root = document.createElement('div');

        expect(readThemeColor('--color-ms-chart-axis-text', '#fff', root)).toBe('#fff');
    });

    it('returns the fallback outside the browser', () => {
        expect(readThemeColor('--color-ms-chart-axis-text', '#fff', null)).toBe('#fff');
    });
});
