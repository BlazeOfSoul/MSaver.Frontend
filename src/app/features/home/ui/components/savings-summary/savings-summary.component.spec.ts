import { TestBed } from '@angular/core/testing';
import { SavingsSummaryComponent } from './savings-summary.component';

describe('Savings summary', () => {
    function setup(months: { label: string; income: number; expense: number }[]) {
        TestBed.configureTestingModule({ imports: [SavingsSummaryComponent] });
        const fixture = TestBed.createComponent(SavingsSummaryComponent);
        fixture.componentRef.setInput('months', months);
        fixture.componentRef.setInput('currency', 'BYN');
        fixture.componentRef.setInput('year', 2026);
        fixture.detectChanges();
        return fixture;
    }

    it('uses total income for the annual share instead of averaging month percentages', () => {
        const fixture = setup([
            { label: 'янв.', income: 1000, expense: 100 },
            { label: 'февр.', income: 100, expense: 200 },
        ]);
        expect(fixture.componentInstance.total().net).toBe(800);
        expect(fixture.componentInstance.total().rate).toBeCloseTo((800 / 1100) * 100);
        expect(fixture.componentInstance.rows()[1].net).toBe(-100);
        expect(fixture.nativeElement.textContent).toContain('800,00 Br');
    });

    it('shows spending without income as a negative amount with no invented percentage', () => {
        const fixture = setup([
            { label: 'янв.', income: 0, expense: 50 },
            { label: 'февр.', income: 0, expense: 0 },
        ]);
        expect(fixture.componentInstance.rows()).toHaveLength(1);
        expect(fixture.componentInstance.total().net).toBe(-50);
        expect(fixture.componentInstance.total().rate).toBeNaN();
        expect(fixture.nativeElement.textContent).toContain('Расходы сверх доходов');
    });

    it('does not turn a missing exchange rate into zero or an empty month', () => {
        const fixture = setup([{ label: 'янв.', income: NaN, expense: 50 }]);
        expect(fixture.componentInstance.rows()).toHaveLength(1);
        expect(fixture.componentInstance.total().net).toBeNaN();
        expect(fixture.nativeElement.textContent).toContain('Нет суммы');
    });
});
