import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartCardComponent } from '../../components/chart-card/chart-card.component';
import {
    HomeChartDataset,
    AnalyticsMetricCard,
    AnalyticsSeriesPoint,
    AnalyticsStackedPoint,
    CategoryBreakdownItem,
} from '../../home-page.models';

@Component({
    selector: 'ms-analytics-tab',
    standalone: true,
    imports: [ChartCardComponent],
    templateUrl: './analytics-tab.component.html',
    styleUrl: './analytics-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsTabComponent {
    metrics = input.required<ReadonlyArray<AnalyticsMetricCard>>();
    incomeVsExpense = input.required<ReadonlyArray<AnalyticsStackedPoint>>();
    expenseCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    incomeCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    monthlyExpenses = input.required<ReadonlyArray<AnalyticsSeriesPoint>>();
    balanceDynamics = input.required<ReadonlyArray<AnalyticsSeriesPoint>>();
    tagExpenses = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    topExpenses = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    yearStats = input.required<ReadonlyArray<AnalyticsMetricCard>>();

    readonly incomeVsExpenseLabels = computed(() =>
        this.incomeVsExpense().map((item) => item.label),
    );
    readonly incomeVsExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Доходы',
            data: this.incomeVsExpense().map((item) => item.income),
            color: '#23c78b',
        },
        {
            label: 'Расходы',
            data: this.incomeVsExpense().map((item) => item.expense),
            color: '#ff6f91',
        },
    ]);

    readonly expenseCategoryLabels = computed(() =>
        this.expenseCategories().map((item) => item.name),
    );
    readonly expenseCategoryDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        this.expenseCategories().map((item, index) => ({
            label: item.name,
            data: [item.amountValue],
            color: this.pickColor(index),
        })),
    );

    readonly incomeCategoryLabels = computed(() =>
        this.incomeCategories().map((item) => item.name),
    );
    readonly incomeCategoryDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        this.incomeCategories().map((item, index) => ({
            label: item.name,
            data: [item.amountValue],
            color: this.pickColor(index),
        })),
    );

    readonly monthlyExpenseLabels = computed(() =>
        this.monthlyExpenses().map((item) => item.label),
    );
    readonly monthlyExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Расходы',
            data: this.monthlyExpenses().map((item) => item.value),
            color: '#ff6f91',
        },
    ]);

    readonly balanceDynamicsLabels = computed(() =>
        this.balanceDynamics().map((item) => item.label),
    );
    readonly balanceDynamicsDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Баланс',
            data: this.balanceDynamics().map((item) => item.value),
            color: '#67a6c1',
            fill: true,
        },
    ]);

    readonly tagExpenseLabels = computed(() => this.tagExpenses().map((item) => item.name));
    readonly tagExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Теги',
            data: this.tagExpenses().map((item) => item.amountValue),
            color: '#23c78b',
        },
    ]);

    readonly topExpenseLabels = computed(() => this.topExpenses().map((item) => item.name));
    readonly topExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Топ расходов',
            data: this.topExpenses().map((item) => item.amountValue),
            color: '#e8b45d',
        },
    ]);

    readonly yearStatLabels = computed(() => this.yearStats().map((item) => item.label));
    readonly yearStatDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Годовая статистика',
            data: this.yearStats().map((item) => this.readAmount(item.value)),
            color: '#23c78b',
        },
    ]);

    private pickColor(index: number): string {
        const colors = ['#23c78b', '#67a6c1', '#ff6f91', '#e8b45d', '#c77dff', '#79e0b5'];
        return colors[index % colors.length];
    }

    private readAmount(value: string): number {
        const normalized = value.replace(/[^\d.,-]/g, '').replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}
