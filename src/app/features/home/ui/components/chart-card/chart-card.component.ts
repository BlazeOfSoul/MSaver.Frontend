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
    buildChartConfiguration,
    readChartThemeColors,
    resolveChartLegendColor,
} from './chart-card.config';
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

        this.chart = new Chart(
            canvas,
            buildChartConfiguration({
                type: this.type(),
                labels: this.labels(),
                datasets: this.datasets(),
                themeColors: readChartThemeColors(),
            }),
        );
    }

    legendColor(index: number): string {
        return resolveChartLegendColor(index, this.datasets());
    }
}
