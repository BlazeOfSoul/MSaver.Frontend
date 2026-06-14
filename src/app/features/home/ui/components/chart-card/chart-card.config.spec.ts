import { ChartOptions } from 'chart.js';
import { MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
import { HomeChartType } from '../../home-page.models';
import {
    buildChartConfiguration,
    resolveChartLegendColor,
    truncateChartAxisLabel,
} from './chart-card.config';

const themeColors = {
    tooltipBackground: '#101010',
    tooltipTitle: '#ffffff',
    tooltipBody: '#eeeeee',
    tooltipBorder: '#333333',
    legendText: '#dddddd',
    axisText: '#cccccc',
    axisSubtleText: '#aaaaaa',
    gridLine: '#555555',
};

describe('chart-card config', () => {
    it('resolves legend colors from dataset slice colors, series colors, and the shared palette', () => {
        expect(
            resolveChartLegendColor(1, [
                { label: 'First', data: [1, 2], color: '#111111', colors: ['#a', '#b'] },
                { label: 'Second', data: [3], color: '#222222' },
            ]),
        ).toBe('#b');
        expect(
            resolveChartLegendColor(1, [
                { label: 'First', data: [1, 2], color: '#111111' },
                { label: 'Second', data: [3], color: '#222222' },
            ]),
        ).toBe('#222222');
        expect(resolveChartLegendColor(2, [])).toBe(MS_CATEGORY_COLORS[2]);
    });

    it('builds doughnut configuration with per-slice colors and no cartesian scales', () => {
        const config = buildChartConfiguration({
            type: 'doughnut',
            labels: ['Rent', 'Food'],
            datasets: [
                {
                    label: 'Expenses',
                    data: [100, 50],
                    color: '#ff6f91',
                    colors: ['#111111', '#222222'],
                },
            ],
            themeColors,
        });

        expect(config.type).toBe('doughnut');
        expect(config.data.labels).toEqual(['Rent', 'Food']);
        expect(config.data.datasets[0].backgroundColor).toEqual(['#111111', '#222222']);
        expect(config.options?.plugins?.legend?.display).toBe(false);
        expect(config.options?.scales).toBeUndefined();
    });

    it('builds bar configuration with per-bar colors when a dataset provides them', () => {
        const config = buildChartConfiguration({
            type: 'bar',
            labels: ['Income', 'Expense'],
            datasets: [
                {
                    label: 'Cash flow',
                    data: [120, 75],
                    color: '#67a6c1',
                    colors: ['#23c78b', '#ff6f91'],
                },
            ],
            themeColors,
        });

        expect(config.data.datasets[0].backgroundColor).toEqual(['#23c78b', '#ff6f91']);
    });

    it('builds line configuration with themed legend and truncated axis labels', () => {
        const config = buildChartConfiguration({
            type: 'line',
            labels: ['Very long category name', 'Short'],
            datasets: [{ label: 'Balance', data: [10, 20], color: '#67a6c1' }],
            themeColors,
        });
        const options = config.options as ChartOptions<HomeChartType>;

        expect(config.data.datasets[0]).toEqual(
            expect.objectContaining({
                backgroundColor: '#67a6c133',
                borderColor: '#67a6c1',
                borderWidth: 2,
                fill: true,
            }),
        );
        expect(config.options?.plugins?.legend?.display).toBe(true);
        expect(config.options?.plugins?.legend?.labels?.color).toBe('#dddddd');
        expect(options.scales?.['x']?.ticks?.callback).toEqual(expect.any(Function));
        expect(truncateChartAxisLabel(['Very long category name'], 0)).toBe('Very long c…');
    });
});
