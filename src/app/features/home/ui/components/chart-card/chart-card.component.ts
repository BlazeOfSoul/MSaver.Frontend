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

        const datasets = this.datasets().map((dataset) => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.color,
            backgroundColor:
                this.type() === 'line'
                    ? `${dataset.color}33`
                    : this.type() === 'doughnut'
                      ? this.datasets().map((item) => item.color)
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
                        display: this.type() !== 'bar',
                        labels: {
                            color: 'rgba(255,255,255,0.72)',
                            usePointStyle: true,
                            boxHeight: 8,
                            boxWidth: 8,
                        },
                    },
                    tooltip: {
                        backgroundColor: '#0e1512',
                        titleColor: '#ffffff',
                        bodyColor: 'rgba(255,255,255,0.78)',
                        borderColor: 'rgba(35,199,139,0.18)',
                        borderWidth: 1,
                    },
                },
                scales:
                    this.type() === 'doughnut'
                        ? undefined
                        : {
                              x: {
                                  ticks: {
                                      color: 'rgba(255,255,255,0.44)',
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
                                      color: 'rgba(255,255,255,0.38)',
                                  },
                                  grid: {
                                      color: 'rgba(255,255,255,0.06)',
                                  },
                                  border: {
                                      display: false,
                                  },
                              },
                          },
            },
        });
    }
}
