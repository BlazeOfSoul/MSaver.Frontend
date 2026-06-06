import { ComponentFixture, TestBed } from '@angular/core/testing';
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
        fixture.componentRef.setInput('expenseCategories', []);
        fixture.componentRef.setInput('incomeCategories', []);
        fixture.componentRef.setInput('monthlyExpenses', []);
        fixture.componentRef.setInput('balanceDynamics', []);
        fixture.componentRef.setInput('tagExpenses', []);
        fixture.componentRef.setInput('topExpenses', []);
        fixture.componentRef.setInput('yearStats', []);
        fixture.componentRef.setInput('accountOptions', [{ value: 'all', label: 'All' }]);
        fixture.componentRef.setInput('selectedAccountId', 'all');
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

    it('builds a net cash flow chart from income and expenses', () => {
        fixture.componentRef.setInput('incomeVsExpense', [
            { label: 'Янв', income: 120, expense: 80 },
            { label: 'Фев', income: 60, expense: 90 },
        ]);

        expect(component.netCashFlowLabels()).toEqual(['Янв', 'Фев']);
        expect(component.netCashFlowDatasets()[0].data).toEqual([40, -30]);
    });

    it('renders tag filters below the tag expense chart', () => {
        fixture.componentRef.setInput('tagExpenses', [
            category('home-tag', 'Home', 120, '#67a6c1'),
            category('transport-tag', 'Transport', 40, '#23c78b'),
        ]);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const chart = host.querySelector('.tag-chart-section ms-chart-card');
        const filterStrip = host.querySelector('.tag-filter-strip');

        expect(chart).not.toBeNull();
        expect(filterStrip).not.toBeNull();
        expect(chart!.compareDocumentPosition(filterStrip!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(host.querySelectorAll('.tag-filter-button')).toHaveLength(3);
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
    };
}
