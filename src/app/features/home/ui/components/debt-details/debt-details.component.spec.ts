import { TestBed } from '@angular/core/testing';
import { DebtDetailsComponent, DebtDetailItem } from './debt-details.component';

describe('Debt detail calculation', () => {
    const item = (
        id: string,
        month: string,
        kind: DebtDetailItem['kind'],
        amount: number,
    ): DebtDetailItem => ({
        id,
        month,
        date: month + '-10T12:00:00Z',
        kind,
        amount,
        amountLabel: String(amount),
        account: 'Основной',
        category: kind,
        description: id,
    });
    it('shows the prior-year opening debt, a partial return and the final zero at the appropriate month', () => {
        const fixture = TestBed.createComponent(DebtDetailsComponent);
        fixture.componentRef.setInput('items', [
            item('given', '2025-12', 'given', 90),
            item('partial', '2026-02', 'received', 40),
            item('final', '2026-03', 'received', 50),
            item('unrelated', '2026-01', 'taken', 120),
        ]);
        fixture.componentRef.setInput('year', 2026);
        fixture.componentRef.setInput('currency', 'BYN');
        fixture.componentRef.setInput('selection', { rowId: 'owed-to-me', monthIndex: 1 });
        fixture.detectChanges();
        expect(fixture.componentInstance.balance()).toBe(50);
        expect(fixture.componentInstance.visibleItems().map((item) => item.id)).toEqual([
            'given',
            'partial',
        ]);
        fixture.componentRef.setInput('selection', { rowId: 'owed-to-me', monthIndex: 11 });
        fixture.detectChanges();
        expect(fixture.componentInstance.increased()).toBe(90);
        expect(fixture.componentInstance.decreased()).toBe(90);
        expect(fixture.componentInstance.balance()).toBe(0);
        expect(fixture.nativeElement.textContent).toContain('0,00 Br');
    });
});
