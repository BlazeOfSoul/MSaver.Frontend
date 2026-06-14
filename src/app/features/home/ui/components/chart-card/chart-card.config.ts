import { ChartConfiguration } from 'chart.js';
import {
    MS_CATEGORY_COLORS,
    MS_CHART_FALLBACK_COLORS,
    MS_CHART_THEME,
    readThemeColor,
} from '../../../../../shared/theme/theme-colors';
import { HomeChartDataset, HomeChartType } from '../../home-page.models';

export interface ChartThemeColors {
    tooltipBackground: string;
    tooltipTitle: string;
    tooltipBody: string;
    tooltipBorder: string;
    legendText: string;
    axisText: string;
    axisSubtleText: string;
    gridLine: string;
}

interface BuildChartConfigurationParams {
    type: HomeChartType;
    labels: ReadonlyArray<string>;
    datasets: ReadonlyArray<HomeChartDataset>;
    themeColors: ChartThemeColors;
}

export function buildChartConfiguration({
    type,
    labels,
    datasets,
    themeColors,
}: BuildChartConfigurationParams): ChartConfiguration<HomeChartType, number[], string> {
    const chartDatasets = datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.color,
        backgroundColor:
            type === 'line'
                ? `${dataset.color}33`
                : type === 'doughnut'
                  ? (dataset.colors ??
                    dataset.data.map((_, index) => resolveChartLegendColor(index, datasets)))
                  : type === 'bar'
                    ? (dataset.colors ?? dataset.color)
                  : dataset.color,
        pointBackgroundColor: dataset.color,
        pointBorderColor: dataset.color,
        tension: 0.34,
        fill: dataset.fill ?? type === 'line',
        borderWidth: type === 'line' ? 2 : 0,
        hoverOffset: type === 'doughnut' ? 4 : 0,
        maxBarThickness: type === 'bar' ? 22 : undefined,
    }));

    return {
        type,
        data: {
            labels: [...labels],
            datasets: chartDatasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: type === 'line',
                    labels: {
                        color: themeColors.legendText,
                        usePointStyle: true,
                        boxHeight: 8,
                        boxWidth: 8,
                    },
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBackground,
                    titleColor: themeColors.tooltipTitle,
                    bodyColor: themeColors.tooltipBody,
                    borderColor: themeColors.tooltipBorder,
                    borderWidth: 1,
                },
            },
            scales:
                type === 'doughnut'
                    ? undefined
                    : {
                          x: {
                              ticks: {
                                  color: themeColors.axisText,
                                  autoSkip: true,
                                  maxRotation: 0,
                                  minRotation: 0,
                                  callback: (value) => truncateChartAxisLabel(labels, Number(value)),
                              },
                              grid: {
                                  display: false,
                              },
                              border: {
                                  display: false,
                              },
                          },
                          y: {
                              beginAtZero: true,
                              ticks: {
                                  color: themeColors.axisSubtleText,
                                  maxTicksLimit: 6,
                              },
                              grid: {
                                  color: themeColors.gridLine,
                              },
                              border: {
                                  display: false,
                              },
                          },
                      },
        },
    };
}

export function resolveChartLegendColor(
    index: number,
    datasets: ReadonlyArray<HomeChartDataset>,
): string {
    const firstDataset = datasets[0];
    const paletteColor = MS_CATEGORY_COLORS[index % MS_CATEGORY_COLORS.length];

    return (
        firstDataset?.colors?.[index] ??
        datasets[index]?.color ??
        firstDataset?.color ??
        paletteColor ??
        readThemeColor(MS_CHART_THEME.fallbackSeries, MS_CHART_FALLBACK_COLORS.fallbackSeries)
    );
}

export function readChartThemeColors(): ChartThemeColors {
    return {
        tooltipBackground: readThemeColor(
            MS_CHART_THEME.tooltipBackground,
            MS_CHART_FALLBACK_COLORS.tooltipBackground,
        ),
        tooltipTitle: readThemeColor(
            MS_CHART_THEME.tooltipTitle,
            MS_CHART_FALLBACK_COLORS.tooltipTitle,
        ),
        tooltipBody: readThemeColor(
            MS_CHART_THEME.tooltipBody,
            MS_CHART_FALLBACK_COLORS.tooltipBody,
        ),
        tooltipBorder: readThemeColor(
            MS_CHART_THEME.tooltipBorder,
            MS_CHART_FALLBACK_COLORS.tooltipBorder,
        ),
        legendText: readThemeColor(MS_CHART_THEME.legendText, MS_CHART_FALLBACK_COLORS.legendText),
        axisText: readThemeColor(MS_CHART_THEME.axisText, MS_CHART_FALLBACK_COLORS.axisText),
        axisSubtleText: readThemeColor(
            MS_CHART_THEME.axisSubtleText,
            MS_CHART_FALLBACK_COLORS.axisSubtleText,
        ),
        gridLine: readThemeColor(MS_CHART_THEME.gridLine, MS_CHART_FALLBACK_COLORS.gridLine),
    };
}

export function truncateChartAxisLabel(labels: ReadonlyArray<string>, index: number): string {
    const label = labels[index] ?? '';

    return label.length > 12 ? `${label.slice(0, 11)}…` : label;
}
