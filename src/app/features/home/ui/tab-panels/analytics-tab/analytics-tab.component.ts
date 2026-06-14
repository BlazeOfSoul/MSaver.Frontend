import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
    MS_ANALYTICS_CHART_COLORS,
    MS_CATEGORY_COLORS,
    MS_CATEGORY_OTHER_COLOR,
} from '../../../../../shared/theme/theme-colors';
import { AnalyticsMonthTableComponent } from '../../components/analytics-month-table/analytics-month-table.component';
import {
    AnalyticsOverviewPanelComponent,
    AnalyticsViewId,
    AnalyticsViewOption,
} from '../../components/analytics-overview-panel/analytics-overview-panel.component';
import { ChartCardComponent } from '../../components/chart-card/chart-card.component';
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
import {
    AnalyticsTagChartLimit,
    breakdownLabels,
    buildBreakdownDataset,
    buildNetCashFlowDataset,
    buildStackedIncomeExpenseDatasets,
    buildValueDataset,
    chartLabels,
    isTagChartLimit,
    limitBreakdownItems,
    selectLimitedBreakdownItems,
} from './analytics-tab.helpers';

@Component({
    selector: 'ms-analytics-tab',
    standalone: true,
    imports: [
        ChartCardComponent,
        AnalyticsMonthTableComponent,
        AnalyticsOverviewPanelComponent,
        SelectComponent,
    ],
    templateUrl: './analytics-tab.component.html',
    styleUrls: [
        './analytics-tab.component.css',
        './analytics-tab.part-2.css',
        './analytics-tab.part-3.css',
    ],
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
    savingsRate = input.required<ReadonlyArray<AnalyticsSeriesPoint>>();
    tagExpenses = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    topExpenses = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedAccountId = input.required<string>();

    accountChange = output<string>();
    readonly activeView = signal<AnalyticsViewId>('monthly');
    readonly selectedTagExpenseId = signal('all');
    readonly tagChartType = signal<HomeChartType>('doughnut');
    readonly tagChartLimit = signal<AnalyticsTagChartLimit>('10');

    readonly analyticsViews: ReadonlyArray<AnalyticsViewOption> = [
        { id: 'monthly', label: 'Месяц' },
        { id: 'yearly', label: 'Год' },
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

    readonly incomeVsExpenseLabels = computed(() => chartLabels(this.incomeVsExpense()));
    readonly incomeVsExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildStackedIncomeExpenseDatasets(
            this.incomeVsExpense(),
            { income: 'Доходы', expense: 'Расходы' },
            {
                income: MS_ANALYTICS_CHART_COLORS.income,
                expense: MS_ANALYTICS_CHART_COLORS.expense,
            },
        ),
    );

    readonly visibleExpenseCategories = computed(() =>
        limitBreakdownItems(this.expenseCategories(), {
            otherLabel: 'Прочее',
            otherColor: MS_CATEGORY_OTHER_COLOR,
        }),
    );
    readonly expenseCategoryLabels = computed(() =>
        breakdownLabels(this.visibleExpenseCategories()),
    );
    readonly expenseCategoryDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildBreakdownDataset(
            'Расходы',
            this.visibleExpenseCategories(),
            MS_ANALYTICS_CHART_COLORS.expense,
            MS_CATEGORY_COLORS,
        ),
    );

    readonly visibleIncomeCategories = computed(() =>
        limitBreakdownItems(this.incomeCategories(), {
            otherLabel: 'Прочее',
            otherColor: MS_CATEGORY_OTHER_COLOR,
        }),
    );
    readonly incomeCategoryLabels = computed(() =>
        breakdownLabels(this.visibleIncomeCategories()),
    );
    readonly incomeCategoryDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildBreakdownDataset(
            'Доходы',
            this.visibleIncomeCategories(),
            MS_ANALYTICS_CHART_COLORS.income,
            MS_CATEGORY_COLORS,
        ),
    );

    readonly monthlyCashFlowLabels: ReadonlyArray<string> = ['Доходы', 'Расходы'];
    readonly monthlyCashFlowDatasets = computed<ReadonlyArray<HomeChartDataset>>(() => [
        {
            label: 'Сумма',
            data: [
                sumBreakdownValues(this.incomeCategories()),
                sumBreakdownValues(this.expenseCategories()),
            ],
            color: MS_ANALYTICS_CHART_COLORS.balance,
            colors: [MS_ANALYTICS_CHART_COLORS.income, MS_ANALYTICS_CHART_COLORS.expense],
        },
    ]);

    readonly monthlyExpenseLabels = computed(() => chartLabels(this.monthlyExpenses()));
    readonly monthlyExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildValueDataset('Расходы', this.monthlyExpenses(), MS_ANALYTICS_CHART_COLORS.expense),
    );

    readonly balanceDynamicsLabels = computed(() => chartLabels(this.balanceDynamics()));
    readonly balanceDynamicsDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildValueDataset(
            'Баланс',
            this.balanceDynamics(),
            MS_ANALYTICS_CHART_COLORS.balance,
            true,
        ),
    );

    readonly netCashFlowLabels = computed(() => chartLabels(this.incomeVsExpense()));
    readonly netCashFlowDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildNetCashFlowDataset(
            this.incomeVsExpense(),
            'Чистый поток',
            MS_ANALYTICS_CHART_COLORS.balance,
        ),
    );

    readonly savingsRateLabels = computed(() => chartLabels(this.savingsRate()));
    readonly savingsRateDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildValueDataset(
            'Норма накоплений',
            this.savingsRate(),
            MS_ANALYTICS_CHART_COLORS.savings,
            true,
        ),
    );

    readonly tagExpenseOptions = computed<ReadonlyArray<MsSelectOption>>(() => [
        { value: 'all', label: 'Все теги' },
        ...this.tagExpenses().map((item) => ({
            value: item.id,
            label: item.name,
            color: item.color,
        })),
    ]);
    readonly selectedTagExpenses = computed(() =>
        selectLimitedBreakdownItems(this.tagExpenses(), this.selectedTagExpenseId(), 'all'),
    );
    readonly visibleTagExpenses = computed(() =>
        selectLimitedBreakdownItems(
            this.tagExpenses(),
            this.selectedTagExpenseId(),
            this.tagChartLimit(),
        ),
    );
    readonly tagExpenseLabels = computed(() => breakdownLabels(this.visibleTagExpenses()));
    readonly tagExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildBreakdownDataset(
            'Теги',
            this.visibleTagExpenses(),
            MS_ANALYTICS_CHART_COLORS.tags,
            MS_CATEGORY_COLORS,
        ),
    );

    readonly topExpenseLabels = computed(() => breakdownLabels(this.topExpenses()));
    readonly topExpenseDatasets = computed<ReadonlyArray<HomeChartDataset>>(() =>
        buildBreakdownDataset(
            'Топ расходов',
            this.topExpenses(),
            MS_ANALYTICS_CHART_COLORS.topExpenses,
            MS_CATEGORY_COLORS,
        ),
    );

    setTagChartType(value: string): void {
        if (value === 'bar' || value === 'doughnut') {
            this.tagChartType.set(value);
        }
    }

    setTagChartLimit(value: string): void {
        if (isTagChartLimit(value)) {
            this.tagChartLimit.set(value);
        }
    }

    setActiveView(value: AnalyticsViewId): void {
        this.activeView.set(value);
    }
}

function sumBreakdownValues(items: ReadonlyArray<CategoryBreakdownItem>): number {
    return items.reduce((sum, item) => sum + item.amountValue, 0);
}
