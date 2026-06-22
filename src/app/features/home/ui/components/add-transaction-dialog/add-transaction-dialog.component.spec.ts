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
        fixture.componentRef.setInput('currencyCode', 'BYN');
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

        component.close.subscribe(closeSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const backdrop = host.querySelector<HTMLElement>('.dialog-backdrop');
        const dialog = host.querySelector<HTMLElement>('.dialog');

        expect(backdrop).not.toBeNull();
        expect(dialog).not.toBeNull();

        dialog!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(closeSpy).not.toHaveBeenCalled();

        backdrop!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(closeSpy).toHaveBeenCalledOnce();
    });

    it('keeps the dialog open when pointer selection starts inside and ends on the backdrop', () => {
        const closeSpy = vi.fn();

        component.close.subscribe(closeSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const backdrop = host.querySelector<HTMLElement>('.dialog-backdrop');
        const dialog = host.querySelector<HTMLElement>('.dialog');

        expect(backdrop).not.toBeNull();
        expect(dialog).not.toBeNull();

        dialog!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

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

    it('sorts visible category options alphabetically without dropping option colors', () => {
        fixture.componentRef.setInput('expenseCategoryOptions', [
            { value: 'taxi-id', label: 'Taxi', color: '#67a6c1' },
            { value: 'food-id', label: 'Food', color: '#ff6f91' },
            { value: 'books-id', label: 'Books', color: '#e8b45d' },
        ]);

        expect(component.categoryOptions()).toEqual([
            { value: 'books-id', label: 'Books', color: '#e8b45d' },
            { value: 'food-id', label: 'Food', color: '#ff6f91' },
            { value: 'taxi-id', label: 'Taxi', color: '#67a6c1' },
        ]);
    });

    it('renders the selected account currency as a static amount suffix', () => {
        fixture.componentRef.setInput('currencyCode', 'USD');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const suffix = host.querySelector<HTMLElement>('.dialog__amount-currency');

        expect(suffix?.textContent?.trim()).toBe('USD');
    });

    it('uses a danger amount tone for expense transactions', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const amountCard = host.querySelector<HTMLElement>('.dialog__amount-card');

        expect(amountCard?.classList.contains('dialog__amount-card--expense')).toBe(true);
        expect(amountCard?.classList.contains('dialog__amount-card--income')).toBe(false);
    });

    it('separates account and amount into their own visual sections', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.dialog__account-section ms-select')).not.toBeNull();
        expect(host.querySelector('.dialog__amount-section .dialog__amount-card')).not.toBeNull();
    });

    it('renders the category dropdown with searchable filtering enabled', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const accountSelect = host.querySelector<HTMLElement>('.dialog__account-section ms-select');
        const categorySelect = host.querySelector<HTMLElement>('.dialog__grid ms-select');

        accountSelect?.querySelector<HTMLButtonElement>('.ms-select__trigger')?.click();
        fixture.detectChanges();

        expect(accountSelect?.querySelector('.ms-select__search-input')).toBeNull();

        categorySelect?.querySelector<HTMLButtonElement>('.ms-select__trigger')?.click();
        fixture.detectChanges();

        const searchInput = categorySelect?.querySelector<HTMLInputElement>(
            '.ms-select__search-input',
        );

        expect(searchInput).not.toBeNull();
        expect(searchInput?.placeholder).toBe('Поиск категории');
    });

    it('renders date and time through an app-styled picker instead of a native datetime-local input', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('input[type="datetime-local"]')).toBeNull();
        expect(host.querySelector('.dialog__date-trigger')).not.toBeNull();
        expect(host.querySelector('.dialog__date-picker')).toBeNull();

        host.querySelector<HTMLButtonElement>('.dialog__date-trigger')?.click();
        fixture.detectChanges();

        expect(host.querySelector('.dialog__date-picker')).not.toBeNull();
        expect(host.querySelector('.dialog__date-part-input input')).not.toBeNull();
        expect(host.querySelector('.dialog__time-part-input input')).not.toBeNull();
    });

    it('shows the selected date and time in one input line', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const dateTimeInput = host.querySelector<HTMLInputElement>('.dialog__date-trigger-input');

        expect(dateTimeInput).not.toBeNull();
        expect(dateTimeInput?.value).toBe('05.06.2026 00:00');
    });

    it('shows a dd.mm.yyyy date template and masks compact date typing', () => {
        const draftSpy = vi.fn();
        component.draftChange.subscribe(draftSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        host.querySelector<HTMLButtonElement>('.dialog__date-trigger')?.click();
        fixture.detectChanges();

        const dateInput = host.querySelector<HTMLInputElement>('.dialog__date-part-input input');

        expect(dateInput).not.toBeNull();
        expect(dateInput?.value).toBe('05.06.2026');
        expect(dateInput?.placeholder).toBe('дд.мм.гггг');

        dateInput!.value = '08072026';
        dateInput!.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        expect(dateInput?.value).toBe('08.07.2026');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...draft,
            date: '2026-07-08T00:00',
        });
    });

    it('renders the opened date picker as an overlay so form actions do not shift', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        host.querySelector<HTMLButtonElement>('.dialog__date-trigger')?.click();
        fixture.detectChanges();

        const picker = host.querySelector<HTMLElement>('.dialog__date-picker');

        expect(picker).not.toBeNull();
        expect(getComputedStyle(picker!).position).toBe('absolute');
    });

    it('updates draft date from the app-styled date and time picker fields', () => {
        const draftSpy = vi.fn();
        component.draftChange.subscribe(draftSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        host.querySelector<HTMLButtonElement>('.dialog__date-trigger')?.click();
        fixture.detectChanges();

        const dateInput = host.querySelector<HTMLInputElement>('.dialog__date-part-input input');
        const timeInput = host.querySelector<HTMLInputElement>('.dialog__time-part-input input');

        expect(dateInput).not.toBeNull();
        expect(timeInput).not.toBeNull();

        dateInput!.value = '08.07.2026';
        dateInput!.dispatchEvent(new Event('input', { bubbles: true }));

        expect(draftSpy).toHaveBeenLastCalledWith({
            ...draft,
            date: '2026-07-08T00:00',
        });

        fixture.componentRef.setInput('draft', { ...draft, date: '2026-07-08T00:00' });
        fixture.detectChanges();

        timeInput!.value = '09:45';
        timeInput!.dispatchEvent(new Event('input', { bubbles: true }));

        expect(draftSpy).toHaveBeenLastCalledWith({
            ...draft,
            date: '2026-07-08T09:45',
        });
    });

    it('reads date and time values from native input events', () => {
        const draftSpy = vi.fn();
        const eventApi = component as unknown as {
            onDatePartInputEvent?: (event: Event) => void;
            onTimePartInputEvent?: (event: Event) => void;
        };
        component.draftChange.subscribe(draftSpy);
        fixture.detectChanges();

        expect(eventApi.onDatePartInputEvent).toBeTypeOf('function');
        expect(eventApi.onTimePartInputEvent).toBeTypeOf('function');

        const dateInput = document.createElement('input');
        const dateEvent = new Event('input', { bubbles: true });
        dateInput.value = '08072026';
        Object.defineProperty(dateEvent, 'target', { value: dateInput });

        eventApi.onDatePartInputEvent!(dateEvent);

        expect(component.dateText()).toBe('08.07.2026');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...draft,
            date: '2026-07-08T00:00',
        });

        fixture.componentRef.setInput('draft', { ...draft, date: '2026-07-08T00:00' });
        fixture.detectChanges();

        const timeInput = document.createElement('input');
        const timeEvent = new Event('input', { bubbles: true });
        timeInput.value = '0945';
        Object.defineProperty(timeEvent, 'target', { value: timeInput });

        eventApi.onTimePartInputEvent!(timeEvent);

        expect(component.timeText()).toBe('09:45');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...draft,
            date: '2026-07-08T09:45',
        });
    });
});
