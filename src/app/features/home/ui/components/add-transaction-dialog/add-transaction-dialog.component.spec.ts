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

        component.onBackdropPointerDown({
            target: backdrop,
            currentTarget: backdrop,
        } as unknown as PointerEvent);
        component.onBackdropClick({
            target: backdrop,
            currentTarget: backdrop,
        } as unknown as MouseEvent);

        expect(closeSpy).toHaveBeenCalledOnce();
    });

    it('keeps the dialog open when pointer selection starts inside and ends on the backdrop', () => {
        const closeSpy = vi.fn();
        const backdrop = document.createElement('div');
        const dialog = document.createElement('section');

        component.close.subscribe(closeSpy);

        component.onBackdropPointerDown({
            target: dialog,
            currentTarget: backdrop,
        } as unknown as PointerEvent);
        component.onBackdropClick({
            target: backdrop,
            currentTarget: backdrop,
        } as unknown as MouseEvent);

        expect(closeSpy).not.toHaveBeenCalled();
    });

    it('keeps money values in two-decimal format and parses decimal input safely', () => {
        expect(component.formatMoneyAmount(0)).toBe('0.00');
        expect(component.formatMoneyAmount(12)).toBe('12.00');
        expect(component.formatMoneyAmount(12.3)).toBe('12.30');
        expect(component.parseMoneyAmount('12,345')).toBe(12.35);
        expect(component.parseMoneyAmount('abc')).toBe(0);
    });

    it('keeps the typed amount while editing and formats it only after blur', () => {
        const draftSpy = vi.fn();
        component.draftChange.subscribe(draftSpy);
        fixture.detectChanges();

        component.onAmountInput('10,');

        expect(component.amountText()).toBe('10,');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...draft,
            amount: 10,
        });

        component.onAmountInput('10,5');

        expect(component.amountText()).toBe('10,5');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...draft,
            amount: 10.5,
        });

        component.onAmountBlur();

        expect(component.amountText()).toBe('10.50');
    });

    it('removes the initial zero mask when typing starts before the input visually clears', () => {
        const draftSpy = vi.fn();
        const emptyDraft = { ...draft, amount: 0 };
        fixture.componentRef.setInput('draft', emptyDraft);
        component.draftChange.subscribe(draftSpy);
        fixture.detectChanges();

        component.onAmountFocus();
        component.onAmountInput('0.0012,5');

        expect(component.amountText()).toBe('12,5');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...emptyDraft,
            amount: 12.5,
        });
    });

    it('renders amount as a primary touch-friendly field', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const amountCard = host.querySelector('.dialog__amount-card');

        expect(amountCard).not.toBeNull();
        expect(amountCard?.querySelector('ms-input')).not.toBeNull();
    });
});
