import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MS_CATEGORY_COLORS, MS_CATEGORY_OTHER_COLOR } from '../../../../../shared/theme/theme-colors';
import { AnalyticsTabComponent } from './analytics-tab.component';

describe('AnalyticsTabComponent', () => {
    let fixture: ComponentFixture<AnalyticsTabComponent>;
    let component: AnalyticsTabComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AnalyticsTabComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AnalyticsTabComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('metrics', []);
        fixture.componentRef.setInput('incomeVsExpense', []);
        fixture.componentRef.setInput('categoryMonthTable', {
            months: [],
            incomeRows: [],
            expenseRows: [],
            debtRows: [],
        });
        fixture.componentRef.setInput('expenseCategories', []);
        fixture.componentRef.setInput('incomeCategories', []);
        fixture.componentRef.setInput('monthlyExpenses', []);
        fixture.componentRef.setInput('balanceDynamics', []);
        fixture.componentRef.setInput('savingsRate', []);
        fixture.componentRef.setInput('tagExpenses', []);
        fixture.componentRef.setInput('topExpenses', []);
        fixture.componentRef.setInput('accountOptions', [{ value: 'all', label: 'All' }]);
        fixture.componentRef.setInput('selectedAccountId', 'all');
    });

    it('uses concise singular labels for month and year view tabs', () => {
        expect(component.analyticsViews.slice(0, 2).map((view) => view.label)).toEqual([
            'Месяц',
            'Год',
        ]);
    });

    it('renders the monthly slice section with an even set of useful charts', () => {
        fixture.componentRef.setInput('expenseCategories', [
            category('food', 'Food', 75, '#ff6f91'),
        ]);
        fixture.componentRef.setInput('incomeCategories', [
            category('salary', 'Salary', 120, '#23c78b', 'income'),
        ]);
        fixture.componentRef.setInput('topExpenses', [category('food', 'Food', 75, '#ff6f91')]);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const chartTitles = Array.from(host.querySelectorAll('ms-chart-card h3')).map((title) =>
            title.textContent?.trim(),
        );

        expect(host.textContent ?? '').toContain('Месячный срез');
        expect(host.querySelectorAll('.analytics-section ms-chart-card')).toHaveLength(4);
        expect(chartTitles).toContain('Доходы и расходы');
    });

    it('builds one doughnut dataset with one value and color per expense category', () => {
        fixture.componentRef.setInput('expenseCategories', [
            category('rent', 'Rent', 100, '#23c78b'),
            category('food', 'Food', 50, '#ff6f91'),
            category('tax', 'Tax', 25, '#67a6c1'),
        ]);
        fixture.componentRef.setInput('incomeCategories', []);

        const datasets = component.expenseCategoryDatasets();

        expect(datasets).toHaveLength(1);
        expect(datasets[0].data).toEqual([100, 50, 25]);
        expect(datasets[0].colors).toEqual(['#23c78b', '#ff6f91', '#67a6c1']);
    });

    it('builds one doughnut dataset with one value and color per income category', () => {
        fixture.componentRef.setInput('expenseCategories', []);
        fixture.componentRef.setInput('incomeCategories', [
            category('salary', 'Salary', 1000, '#23c78b', 'income'),
            category('bonus', 'Bonus', 200, '#e8b45d', 'income'),
        ]);

        const datasets = component.incomeCategoryDatasets();

        expect(datasets).toHaveLength(1);
        expect(datasets[0].data).toEqual([1000, 200]);
        expect(datasets[0].colors).toEqual(['#23c78b', '#e8b45d']);
    });

    it('filters tag expense chart by the selected tag', () => {
        fixture.componentRef.setInput('tagExpenses', [
            category('home-tag', 'Home', 120, '#67a6c1'),
            category('transport-tag', 'Transport', 40, '#23c78b'),
        ]);

        component.selectedTagExpenseId.set('transport-tag');

        expect(component.tagExpenseLabels()).toEqual(['Transport']);
        expect(component.tagExpenseDatasets()[0].data).toEqual([40]);
    });

    it('uses a doughnut chart for tags by default', () => {
        expect(component.tagChartType()).toBe('doughnut');
    });

    it('builds a net cash flow chart from income and expenses', () => {
        fixture.componentRef.setInput('incomeVsExpense', [
            { label: 'Янв', income: 120, expense: 80 },
            { label: 'Фев', income: 60, expense: 90 },
        ]);

        expect(component.netCashFlowLabels()).toEqual(['Янв', 'Фев']);
        expect(component.netCashFlowDatasets()[0].data).toEqual([40, -30]);
    });

    it('renders the tag chart without the redundant tag filter strip', () => {
        fixture.componentRef.setInput('tagExpenses', [
            category('home-tag', 'Home', 120, '#67a6c1'),
            category('transport-tag', 'Transport', 40, '#23c78b'),
        ]);
        component.activeView.set('tags');

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const chart = host.querySelector('.tag-chart-section ms-chart-card');
        const filterStrip = host.querySelector('.tag-filter-strip');

        expect(chart).not.toBeNull();
        expect(filterStrip).toBeNull();
        expect(host.querySelectorAll('.tag-filter-button')).toHaveLength(0);
    });

    it('keeps the analytics tab layout stretched instead of collapsing around wide content', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const layout = host.querySelector<HTMLElement>('.analytics-layout');

        expect(layout).not.toBeNull();
        expect(getComputedStyle(layout!).width).toBe('100%');
        expect(getComputedStyle(layout!).minWidth).toBe('0px');
    });

    it('limits long category charts and groups the rest as other', () => {
        fixture.componentRef.setInput(
            'expenseCategories',
            Array.from({ length: 12 }, (_, index) =>
                category(`category-${index}`, `Category ${index}`, 120 - index, '#23c78b'),
            ),
        );

        expect(component.expenseCategoryLabels()).toHaveLength(10);
        expect(component.expenseCategoryLabels()).toContain('Прочее');
        expect(component.expenseCategoryDatasets()[0].data.at(-1)).toBe(330);
    });

    it('uses the shared fallback palette for generated analytics category colors', () => {
        fixture.componentRef.setInput(
            'expenseCategories',
            Array.from({ length: 12 }, (_, index) =>
                category(`category-${index}`, `Category ${index}`, 120 - index, ''),
            ),
        );

        const colors = component.expenseCategoryDatasets()[0].colors ?? [];

        expect(colors.slice(0, 3)).toEqual(MS_CATEGORY_COLORS.slice(0, 3));
        expect(colors.at(-1)).toBe(MS_CATEGORY_OTHER_COLOR);
    });

    it('renders month-by-category tables in the tables view', () => {
        fixture.componentRef.setInput('categoryMonthTable', {
            months: ['янв.', 'фев.'],
            incomeRows: [
                {
                    id: 'salary',
                    name: 'Salary',
                    color: '#23c78b',
                    type: 'income',
                    cells: [
                        { label: 'янв.', value: 100, formattedValue: '100 Br' },
                        { label: 'фев.', value: 120, formattedValue: '120 Br' },
                    ],
                    totalValue: 220,
                    formattedTotal: '220 Br',
                },
            ],
            expenseRows: [
                {
                    id: 'food',
                    name: 'Food',
                    color: '#ff6f91',
                    type: 'expense',
                    cells: [
                        { label: 'янв.', value: 50, formattedValue: '50 Br' },
                        { label: 'фев.', value: 40, formattedValue: '40 Br' },
                    ],
                    totalValue: 90,
                    formattedTotal: '90 Br',
                },
            ],
        });
        component.activeView.set('tables');

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelectorAll('.analytics-table')).toHaveLength(3);
        expect(host.textContent ?? '').toContain('Расходы по категориям');
        expect(host.textContent ?? '').toContain('Доходы по категориям');
        expect(host.textContent ?? '').toContain('Food');
        expect(host.textContent ?? '').toContain('Salary');
    });

    it('renders table footers and a debt table in the tables view', () => {
        fixture.componentRef.setInput('categoryMonthTable', {
            months: ['Jan', 'Feb'],
            incomeRows: [tableRow('salary', 'Salary', 'income', '#23c78b', [100, 120], 220, 110)],
            expenseRows: [tableRow('food', 'Food', 'expense', '#ff6f91', [50, 40], 90, 45)],
            debtRows: [tableRow('owed-by-me', 'I owe', 'debt', '#ff6f91', [20, 10], 10, 15)],
            incomeSummary: summary([100, 120], 220, 110),
            expenseSummary: summary([50, 40], 90, 45),
            debtSummary: summary([20, 10], 10, 15),
        });
        component.activeView.set('tables');

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelectorAll('.analytics-table')).toHaveLength(3);
        expect(host.textContent ?? '').toContain('I owe');
        expect(host.querySelectorAll('.analytics-table tfoot tr')).toHaveLength(3);
        expect(
            host.querySelectorAll('.analytics-table [data-testid="month-average"]'),
        ).toHaveLength(3);
    });

    it('applies tag chart limit settings', () => {
        fixture.componentRef.setInput(
            'tagExpenses',
            Array.from({ length: 8 }, (_, index) =>
                category(`tag-${index}`, `Tag ${index}`, 100 - index, '#67a6c1'),
            ),
        );

        component.setTagChartLimit('5');

        expect(component.tagExpenseLabels()).toHaveLength(5);
    });
});

function category(
    id: string,
    name: string,
    amountValue: number,
    color: string,
    type: 'income' | 'expense' = 'expense',
) {
    return {
        id,
        name,
        amount: `${amountValue}`,
        amountValue,
        progress: 50,
        color,
        type,
        tone: type === 'income' ? ('good' as const) : ('warning' as const),
        isSystem: false,
    };
}

function tableRow(
    id: string,
    name: string,
    type: 'income' | 'expense' | 'debt',
    color: string,
    values: ReadonlyArray<number>,
    totalValue: number,
    averageValue: number,
) {
    return {
        id,
        name,
        color,
        type,
        cells: values.map((value, index) => ({
            label: index === 0 ? 'Jan' : 'Feb',
            value,
            formattedValue: `${value} Br`,
        })),
        totalValue,
        formattedTotal: `${totalValue} Br`,
        averageValue,
        formattedAverage: `${averageValue} Br`,
    };
}

function summary(values: ReadonlyArray<number>, totalValue: number, averageValue: number) {
    return {
        cells: values.map((value, index) => ({
            label: index === 0 ? 'Jan' : 'Feb',
            value,
            formattedValue: `${value} Br`,
        })),
        totalValue,
        formattedTotal: `${totalValue} Br`,
        averageValue,
        formattedAverage: `${averageValue} Br`,
    };
}
