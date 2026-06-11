import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    ViewChild,
    effect,
    input,
} from '@angular/core';
import {
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    DoughnutController,
    Filler,
    Legend,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
    LinearScale,
} from 'chart.js';
import {
    MS_CATEGORY_COLORS,
    MS_CHART_FALLBACK_COLORS,
    MS_CHART_THEME,
    readThemeColor,
} from '../../../../../shared/theme/theme-colors';
import { HomeChartDataset, HomeChartType } from '../../home-page.models';

Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    DoughnutController,
    ArcElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler,
);

@Component({
    selector: 'ms-chart-card',
    standalone: true,
    templateUrl: './chart-card.component.html',
    styleUrl: './chart-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent implements AfterViewInit, OnDestroy {
    @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

    type = input<HomeChartType>('bar');
    title = input.required<string>();
    subtitle = input.required<string>();
    labels = input<ReadonlyArray<string>>([]);
    datasets = input<ReadonlyArray<HomeChartDataset>>([]);
    height = input<number>(240);

    private chart: Chart | null = null;
    private isViewReady = false;

    constructor() {
        effect(() => {
            this.type();
            this.labels();
            this.datasets();
            this.height();

            if (this.isViewReady) {
                this.renderChart();
            }
        });
    }

    get hasData(): boolean {
        return this.datasets().some((dataset) => dataset.data.some((value) => value > 0));
    }

    ngAfterViewInit(): void {
        this.isViewReady = true;
        this.renderChart();
    }

    ngOnDestroy(): void {
        this.chart?.destroy();
    }

    private renderChart(): void {
        const canvas = this.canvasRef?.nativeElement;

        if (!canvas) {
            return;
        }

        this.chart?.destroy();

        const themeColors = this.chartThemeColors();
        const datasets = this.datasets().map((dataset) => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.color,
            backgroundColor:
                this.type() === 'line'
                    ? `${dataset.color}33`
                    : this.type() === 'doughnut'
                      ? (dataset.colors ?? dataset.data.map((_, index) => this.legendColor(index)))
                      : dataset.color,
            pointBackgroundColor: dataset.color,
            pointBorderColor: dataset.color,
            tension: 0.34,
            fill: dataset.fill ?? this.type() === 'line',
            borderWidth: this.type() === 'line' ? 2 : 0,
            hoverOffset: this.type() === 'doughnut' ? 4 : 0,
            maxBarThickness: this.type() === 'bar' ? 22 : undefined,
        }));

        this.chart = new Chart(canvas, {
            type: this.type(),
            data: {
                labels: [...this.labels()],
                datasets,
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
                        display: this.type() === 'line',
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
                    this.type() === 'doughnut'
                        ? undefined
                        : {
                              x: {
                                  ticks: {
                                      color: themeColors.axisText,
                                      autoSkip: true,
                                      maxRotation: 0,
                                      minRotation: 0,
                                      callback: (value) => this.truncateAxisLabel(Number(value)),
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
        });
    }

    legendColor(index: number): string {
        const firstDataset = this.datasets()[0];
        const paletteColor = MS_CATEGORY_COLORS[index % MS_CATEGORY_COLORS.length];

        return (
            firstDataset?.colors?.[index] ??
            this.datasets()[index]?.color ??
            firstDataset?.color ??
            paletteColor ??
            readThemeColor(MS_CHART_THEME.fallbackSeries, MS_CHART_FALLBACK_COLORS.fallbackSeries)
        );
    }

    private chartThemeColors() {
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

    private truncateAxisLabel(index: number): string {
        const label = this.labels()[index] ?? '';

        return label.length > 12 ? `${label.slice(0, 11)}…` : label;
    }
}
