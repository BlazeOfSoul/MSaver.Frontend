import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ChartCardComponent } from '../../components/chart-card/chart-card.component';
import { Button } from '../../../../../shared/ui/button/button';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import {
    AnalyticsCategoryMonthTable,
    HomeChartDataset,
    HomeChartType,
    AnalyticsMetricCard,
    AnalyticsSeriesPoint,
    AnalyticsStackedPoint,
    CategoryBreakdownItem,
} from '../../home-page.models';

type AnalyticsView = 'monthly' | 'yearly' | 'tables' | 'tags';
type TagChartLimit = '5' | '10' | '15' | 'all';

@Component({
    selector: 'ms-analytics-tab',
    standalone: true,
    imports: [Button, ChartCardComponent, SelectComponent],
    templateUrl: './analytics-tab.component.html',
    styleUrl: './analytics-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsTabComponent {
    metrics = input.required<ReadonlyArray<AnalyticsMetricCard>>();
    incomeVsExpense = input.required<ReadonlyArray<AnalyticsStackedPoint>>();
    categoryMonthTable = input.required<AnalyticsCategoryMonthTable>();
    expenseCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    incomeCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    monthlyExpenses = input.required<ReadonlyArray<AnalyticsSeriesPoint>>();
    balanceDynamics = input.required<ReadonlyArray<AnalyticsSeriesPoint>>();
    tagExpenses = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    topExpenses = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    yearStats = input.required<ReadonlyArray<AnalyticsMetricCard>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedAccountId = input.required<string>();

    accountChange = output<string>();
    readonly activeView = signal<AnalyticsView>('monthly');
    readonly selectedTagExpenseId = signal('all');
    readonly tagChartType = signal<HomeChartType>('bar');
    readonly tagChartLimit = signal<TagChartLimit>('10');

    readonly analyticsViews: ReadonlyArray<{ id: AnalyticsView; label: string }> = [
        { id: 'monthly', label: 'Месячные' },
        { id: 'yearly', label: 'Годовые' },
        { id: 'tables', label: 'Таблицы' },
        { id: 'tags', label: 'Теги' },
    ];
    readonly tagChartTypeOptions: ReadonlyArray<MsSelectOption> = [
        { value: 'bar', label: 'Столбцы' },
        { value: 'doughnut', label: 'Кольцо' },
    ];
    readonly tagChartLimitOptions: ReadonlyArray<MsSelectOption> = [
        { value: '5', label: 'Топ 5' },
        { value: '10', label: 'Топ 10' },
        { value: '15', label: 'Топ 15' },
        { value: 'all', label: 'Все' },
    ];

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

    readonly visibleExpenseCategories = computed(() =>
        this.limitCategoryChartItems(this.expenseCategories()),
    );
    readonly expenseCategoryLabels = computed(() =>
        this.visibleExpenseCategories().map((item) => item.name),
    );
    readonly expenseCategoryDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Расходы',
            data: this.visibleExpenseCategories().map((item) => item.amountValue),
            color: '#ff6f91',
            colors: this.visibleExpenseCategories().map(
                (item, index) => item.color || this.pickColor(index),
            ),
        },
    ]);

    readonly visibleIncomeCategories = computed(() =>
        this.limitCategoryChartItems(this.incomeCategories()),
    );
    readonly incomeCategoryLabels = computed(() =>
        this.visibleIncomeCategories().map((item) => item.name),
    );
    readonly incomeCategoryDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Доходы',
            data: this.visibleIncomeCategories().map((item) => item.amountValue),
            color: '#23c78b',
            colors: this.visibleIncomeCategories().map(
                (item, index) => item.color || this.pickColor(index),
            ),
        },
    ]);

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

    readonly netCashFlowLabels = computed(() =>
        this.incomeVsExpense().map((item) => item.label),
    );
    readonly netCashFlowDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Чистый поток',
            data: this.incomeVsExpense().map((item) => item.income - item.expense),
            color: '#67a6c1',
            fill: true,
        },
    ]);

    readonly tagExpenseOptions = computed<ReadonlyArray<MsSelectOption>>(() => [
        { value: 'all', label: 'Все теги' },
        ...this.tagExpenses().map((item) => ({
            value: item.id,
            label: item.name,
            color: item.color,
        })),
    ]);
    readonly selectedTagExpenses = computed(() => {
        const selectedTagId = this.selectedTagExpenseId();
        const tags = [...this.tagExpenses()].sort((left, right) => right.amountValue - left.amountValue);

        if (selectedTagId === 'all') {
            return tags;
        }

        return tags.filter((item) => item.id === selectedTagId);
    });
    readonly visibleTagExpenses = computed(() => {
        const selected = this.selectedTagExpenses();
        const limit = this.tagChartLimit();

        if (limit === 'all') {
            return selected;
        }

        return selected.slice(0, Number(limit));
    });
    readonly tagExpenseLabels = computed(() =>
        this.visibleTagExpenses().map((item) => item.name),
    );
    readonly tagExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Теги',
            data: this.visibleTagExpenses().map((item) => item.amountValue),
            color: '#23c78b',
            colors: this.visibleTagExpenses().map((item, index) => item.color || this.pickColor(index)),
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

    setTagChartType(value: string): void {
        if (value === 'bar' || value === 'doughnut') {
            this.tagChartType.set(value);
        }
    }

    setTagChartLimit(value: string): void {
        if (value === '5' || value === '10' || value === '15' || value === 'all') {
            this.tagChartLimit.set(value);
        }
    }

    private pickColor(index: number): string {
        const colors = ['#23c78b', '#67a6c1', '#ff6f91', '#e8b45d', '#c77dff', '#79e0b5'];
        return colors[index % colors.length];
    }

    private limitCategoryChartItems(
        items: ReadonlyArray<CategoryBreakdownItem>,
    ): CategoryBreakdownItem[] {
        const sorted = [...items].sort((left, right) => right.amountValue - left.amountValue);

        if (sorted.length <= 10) {
            return sorted;
        }

        const visible = sorted.slice(0, 9);
        const rest = sorted.slice(9);
        const amountValue = rest.reduce((sum, item) => sum + item.amountValue, 0);

        return [
            ...visible,
            {
                id: 'other',
                name: 'Прочее',
                amount: '',
                amountValue,
                progress: 0,
                color: '#8aa39a',
                type: visible[0]?.type ?? 'expense',
                tone: 'warning',
                isSystem: false,
            },
        ];
    }

    private readAmount(value: string): number {
        const normalized = value.replace(/[^\d.,-]/g, '').replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}
