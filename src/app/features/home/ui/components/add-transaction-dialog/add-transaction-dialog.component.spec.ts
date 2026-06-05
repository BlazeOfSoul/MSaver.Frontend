import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddTransactionDialogComponent } from './add-transaction-dialog.component';
import { TransactionDraft } from '../../home-page.models';

const draft: TransactionDraft = {
    type: 'expense',
    accountId: 'account-id',
    categoryId: 'category-id',
    amount: 12.3,
    date: '2026-06-05',
    description: '',
};

describe('AddTransactionDialogComponent', () => {
    let fixture: ComponentFixture<AddTransactionDialogComponent>;
    let component: AddTransactionDialogComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AddTransactionDialogComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AddTransactionDialogComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('open', true);
        fixture.componentRef.setInput('saving', false);
        fixture.componentRef.setInput('draft', draft);
        fixture.componentRef.setInput('accountOptions', [{ value: 'account-id', label: 'Main' }]);
        fixture.componentRef.setInput('incomeCategoryOptions', [
            { value: 'income-id', label: 'Salary' },
        ]);
        fixture.componentRef.setInput('expenseCategoryOptions', [
            { value: 'category-id', label: 'Food' },
        ]);
    });

    it('closes only when the backdrop itself is clicked', () => {
        const closeSpy = vi.fn();
        const backdrop = document.createElement('div');
        const dialog = document.createElement('section');

        component.close.subscribe(closeSpy);

        component.onBackdropClick({
            target: dialog,
            currentTarget: backdrop,
        } as unknown as MouseEvent);

        expect(closeSpy).not.toHaveBeenCalled();

        component.onBackdropClick({
            target: backdrop,
            currentTarget: backdrop,
        } as unknown as MouseEvent);

        expect(closeSpy).toHaveBeenCalledOnce();
    });

    it('keeps money values in two-decimal format and parses decimal input safely', () => {
        expect(component.formatMoneyAmount(0)).toBe('0.00');
        expect(component.formatMoneyAmount(12)).toBe('12.00');
        expect(component.formatMoneyAmount(12.3)).toBe('12.30');
        expect(component.parseMoneyAmount('12,345')).toBe(12.35);
        expect(component.parseMoneyAmount('abc')).toBe(0);
    });
});
