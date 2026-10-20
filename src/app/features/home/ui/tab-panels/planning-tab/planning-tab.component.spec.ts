import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { PwaPushNotificationService } from '../../../../../core/push/pwa-push-notification.service';
import {
    BudgetItemResponse,
    RecurringTransactionResponse,
} from '../../../data-access/home-api.models';
import { HomeApiService } from '../../../data-access/home-api.service';
import { CategoryBreakdownItem } from '../../home-page.models';
import { PlanningTabComponent } from './planning-tab.component';

function category(overrides: Partial<CategoryBreakdownItem> = {}): CategoryBreakdownItem {
    return {
        id: 'food-id',
        name: 'Food',
        amount: '0.00 BYN',
        amountValue: 0,
        progress: 0,
        color: '#23c78b',
        type: 'expense',
        tone: 'good',
        isSystem: false,
        ...overrides,
    };
}

function recurring(
    overrides: Partial<RecurringTransactionResponse> = {},
): RecurringTransactionResponse {
    return {
        id: 'recurring-id',
        accountId: 'account-id',
        accountName: 'Main account',
        currencyCode: 'BYN',
        categoryId: 'food-id',
        categoryName: 'Food',
        categoryColor: '#23c78b',
        amount: -25,
        description: 'Lunch',
        frequency: 'Monthly',
        dayOfMonth: 18,
        nextOccurrenceAt: '2026-07-18T12:00:00.000Z',
        timeZoneId: 'Europe/Minsk',
        notificationsEnabled: true,
        isActive: true,
        ...overrides,
    };
}

function budget(overrides: Partial<BudgetItemResponse> = {}): BudgetItemResponse {
    return {
        accountId: 'account-id',
        accountName: 'Main account',
        currencyCode: 'BYN',
        categoryId: 'food-id',
        categoryName: 'Food',
        categoryColor: '#23c78b',
        amount: 500,
        spentAmount: 550,
        remainingAmount: -50,
        progress: 110,
        ...overrides,
    };
}

describe('PlanningTabComponent', () => {
    let fixture: ComponentFixture<PlanningTabComponent>;
    let component: PlanningTabComponent;
    let api: {
        getBudgets: ReturnType<typeof vi.fn>;
        getRecurringTransactions: ReturnType<typeof vi.fn>;
        upsertBudget: ReturnType<typeof vi.fn>;
        deleteBudget: ReturnType<typeof vi.fn>;
        createRecurringTransaction: ReturnType<typeof vi.fn>;
        updateRecurringTransaction: ReturnType<typeof vi.fn>;
        completeRecurringTransaction: ReturnType<typeof vi.fn>;
        skipRecurringTransaction: ReturnType<typeof vi.fn>;
        deleteRecurringTransaction: ReturnType<typeof vi.fn>;
    };
    let pushNotifications: {
        enable: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        api = {
            getBudgets: vi.fn(() =>
                of({
                    year: 2026,
                    month: 7,
                    items: [],
                }),
            ),
            getRecurringTransactions: vi.fn(() => of([])),
            upsertBudget: vi.fn(() => of(undefined)),
            deleteBudget: vi.fn(() => of(undefined)),
            createRecurringTransaction: vi.fn(() => of(recurring())),
            updateRecurringTransaction: vi.fn(() => of(recurring())),
            completeRecurringTransaction: vi.fn(() => of('transaction-id')),
            skipRecurringTransaction: vi.fn(() => of(undefined)),
            deleteRecurringTransaction: vi.fn(() => of(undefined)),
        };
        pushNotifications = {
            enable: vi.fn(() => Promise.resolve('enabled')),
        };

        await TestBed.configureTestingModule({
            imports: [PlanningTabComponent],
            providers: [
                { provide: HomeApiService, useValue: api },
                { provide: PwaPushNotificationService, useValue: pushNotifications },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlanningTabComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('month', new Date(2026, 6, 1));
        fixture.componentRef.setInput('accounts', [{ value: 'account-id', label: 'Main account' }]);
        fixture.componentRef.setInput('expenseCategories', [category()]);
        fixture.componentRef.setInput('incomeCategories', []);
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('renders actions only for due occurrences and a passive status for future ones', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
        component.currentTime.set(Date.now());
        fixture.componentRef.setInput('view', 'recurring');
        fixture.detectChanges();

        const due = recurring({ id: 'due', nextOccurrenceAt: '2026-07-18T12:00:00.000Z' });
        const future = recurring({
            id: 'future',
            nextOccurrenceAt: '2026-07-18T12:00:00.001Z',
        });
        component.recurringTransactions.set([due, future]);
        component.openRecurringPlanning();
        fixture.detectChanges();

        const rows = Array.from(
            (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.recurring-row'),
        );
        const dueActions = rows[0].querySelector<HTMLElement>('.recurring-row__actions');
        const futureActions = rows[1].querySelector<HTMLElement>('.recurring-row__actions');

        expect(rows[0].classList.contains('recurring-row--due')).toBe(true);
        expect(dueActions?.querySelector('.recurring-row__confirm')).not.toBeNull();
        expect(dueActions?.querySelector('.recurring-row__skip')).not.toBeNull();
        expect(
            dueActions?.querySelector('.recurring-row__confirm')?.getAttribute('aria-label'),
        ).toContain(due.description);
        expect(dueActions?.querySelectorAll('.recurring-row__delete')).toHaveLength(1);
        expect(rows[1].classList.contains('recurring-row--due')).toBe(false);
        expect(
            rows[1].querySelector('.recurring-row__copy .recurring-row__status')?.textContent,
        ).toContain('Ожидается');
        expect(futureActions?.querySelector('.recurring-row__confirm')).toBeNull();
        expect(futureActions?.querySelector('.recurring-row__skip')).toBeNull();
        expect(
            futureActions?.querySelector('.recurring-row__delete')?.getAttribute('aria-label'),
        ).toContain(future.description);
        expect(futureActions?.querySelectorAll('.recurring-row__delete')).toHaveLength(1);
        expect(futureActions?.querySelector('.recurring-row__delete')?.textContent).toContain(
            'Удалить',
        );
    });

    it('makes an occurrence actionable on the clock tick and stops the clock after destroy', async () => {
        fixture.destroy();
        vi.useFakeTimers();
        const start = new Date('2026-07-18T12:00:00.000Z');
        vi.setSystemTime(start);

        fixture = TestBed.createComponent(PlanningTabComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('month', new Date(2026, 6, 1));
        fixture.componentRef.setInput('view', 'recurring');
        fixture.componentRef.setInput('accounts', [{ value: 'account-id', label: 'Main account' }]);
        fixture.componentRef.setInput('expenseCategories', [category()]);
        fixture.componentRef.setInput('incomeCategories', []);
        fixture.detectChanges();
        component.recurringTransactions.set([
            recurring({ nextOccurrenceAt: '2026-07-18T12:00:30.000Z' }),
        ]);
        component.openRecurringPlanning();
        fixture.detectChanges();

        const confirmButton = () =>
            (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
                '.recurring-row__confirm',
            );
        const passiveStatus = () =>
            (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
                '.recurring-row__status',
            );

        expect(confirmButton()).toBeNull();
        expect(passiveStatus()?.textContent).toContain('Ожидается');

        await vi.advanceTimersByTimeAsync(30_000);
        fixture.detectChanges();

        expect(component.currentTime()).toBe(start.getTime() + 30_000);
        expect(confirmButton()).not.toBeNull();
        expect(passiveStatus()).toBeNull();
        expect(confirmButton()?.textContent).toContain('Подтвердить');

        const timeAtDestroy = component.currentTime();
        fixture.destroy();
        vi.setSystemTime(new Date(start.getTime() + 60_000));
        await vi.advanceTimersByTimeAsync(30_000);

        expect(component.currentTime()).toBe(timeAtDestroy);
    });

    it('skips a due occurrence after confirmation and reloads the schedule', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
        component.currentTime.set(Date.now());
        fixture.componentRef.setInput('view', 'recurring');
        fixture.detectChanges();
        const due = recurring();
        component.recurringTransactions.set([due]);
        api.getRecurringTransactions.mockClear();

        component.skipRecurringTransaction(due);

        expect(component.pendingConfirmation()?.message).toContain('не будет добавлена');
        expect(api.skipRecurringTransaction).not.toHaveBeenCalled();
        component.confirmPendingAction();

        expect(api.skipRecurringTransaction).toHaveBeenCalledWith(due.id);
        expect(api.getRecurringTransactions).toHaveBeenCalledTimes(1);
        expect(component.message()).toContain('пропущена');
    });

    it('does not skip a future occurrence or a due occurrence without confirmation', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
        component.currentTime.set(Date.now());
        fixture.componentRef.setInput('view', 'recurring');
        fixture.detectChanges();
        const future = recurring({ nextOccurrenceAt: '2026-07-18T12:00:00.001Z' });
        const due = recurring();

        component.skipRecurringTransaction(future);
        expect(component.pendingConfirmation()).toBeNull();
        component.skipRecurringTransaction(due);
        expect(component.pendingConfirmation()).not.toBeNull();
        component.closeConfirmation();

        expect(api.skipRecurringTransaction).not.toHaveBeenCalled();
    });

    it('renders the budget view without recurring-operation controls', () => {
        component.budgets.set([budget()]);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelector('.budget-row--over')).not.toBeNull();
        expect(host.querySelector('.recurring-row')).toBeNull();
        expect(
            host.querySelector('.budget-row ms-button.ms-btn-outline.ms-btn-danger'),
        ).not.toBeNull();
        expect(
            host.querySelector('.budget-row ms-button .material-symbols-outlined')?.textContent,
        ).toContain('delete');
    });

    it('keeps recurring details behind a compact launcher with one notification toggle', () => {
        fixture.componentRef.setInput('view', 'recurring');
        fixture.detectChanges();
        component.recurringTransactions.set([recurring()]);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelector('.budget-row')).toBeNull();
        expect(host.querySelector('.planning-launcher')).not.toBeNull();
        expect(host.textContent).toContain('1 активная операция');
        expect(host.querySelector('.recurring-row')).toBeNull();
        expect(host.querySelectorAll('.planning-notification-toggle__input')).toHaveLength(0);

        component.openRecurringPlanning();
        fixture.detectChanges();

        expect(host.querySelector('.planning-recurring-dialog')).not.toBeNull();
        expect(host.querySelector('.recurring-row')).not.toBeNull();
        expect(host.querySelectorAll('.planning-notification-toggle__input')).toHaveLength(1);
        expect(host.textContent).not.toContain('Включить уведомления');
    });

    it('renders recurring operations inline when embedded in the transactions subtab', () => {
        fixture.componentRef.setInput('view', 'recurring');
        fixture.componentRef.setInput('embedded', true);
        component.recurringTransactions.set([recurring()]);
        component.message.set('Расписание сохранено.');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const embedded = host.querySelector<HTMLElement>('.planning-recurring-embedded');

        expect(embedded).not.toBeNull();
        expect(embedded?.getAttribute('role')).toBe('region');
        expect(host.querySelector('.planning-launcher')).toBeNull();
        expect(host.querySelector('.planning-recurring-dialog')).toBeNull();
        expect(host.querySelector('.planning-recurring-dialog__close')).toBeNull();
        expect(host.querySelectorAll('.planning-notification-toggle__input')).toHaveLength(1);
        expect(host.querySelectorAll('.planning-notice')).toHaveLength(1);
    });

    it('edits an existing schedule without resetting its time zone, anchor day or notifications', async () => {
        const item = recurring({
            dayOfMonth: 31,
            nextOccurrenceAt: '2026-02-28T08:30:42.000Z',
            timeZoneId: 'Europe/Berlin',
        });
        component.editRecurringTransaction(item);
        expect(component.recurringAmount.value).toBe(String(Math.abs(item.amount)));
        expect(component.recurringCategoryId()).toBe(item.categoryId);
        component.recurringAmount.setValue('59,90');
        component.recurringDescription.setValue('Updated subscription');
        await component.saveRecurringTransaction();
        expect(api.updateRecurringTransaction).toHaveBeenCalledWith(
            item.id,
            expect.objectContaining({
                amount: -59.9,
                description: 'Updated subscription',
                nextOccurrenceAt: item.nextOccurrenceAt,
                timeZoneId: 'Europe/Berlin',
                dayOfMonth: 31,
                isActive: true,
                notificationsEnabled: true,
            }),
        );
        expect(api.createRecurringTransaction).not.toHaveBeenCalled();
        expect(pushNotifications.enable).not.toHaveBeenCalled();
        expect(component.editingRecurring()).toBeNull();
        expect(component.message()).toBe('Расписание обновлено.');
    });

    it('updates the date and recurrence and preserves an unsuccessful edit for retry', async () => {
        const item = recurring();
        component.editRecurringTransaction(item);
        component.setRecurringDateTime('2026-10-25T10:45');
        component.setRecurringFrequency('Weekly');
        api.updateRecurringTransaction.mockReturnValue(throwError(() => new Error('offline')));
        await component.saveRecurringTransaction();
        const payload = api.updateRecurringTransaction.mock.calls[0][1];
        expect(payload.nextOccurrenceAt).toBe(new Date(2026, 9, 25, 10, 45).toISOString());
        expect(payload.frequency).toBe('Weekly');
        expect(payload.dayOfMonth).toBeUndefined();
        expect(component.editingRecurring()?.id).toBe(item.id);
        expect(component.recurringAmount.value).toBe(String(Math.abs(item.amount)));
        expect(component.saving()).toBe(false);
    });

    it('cancels editing without saving or leaving the previous schedule in the form', () => {
        component.editRecurringTransaction(recurring({ amount: 500, description: 'Salary' }));
        expect(component.recurringKind()).toBe('income');
        component.cancelRecurringEdit();
        expect(component.editingRecurring()).toBeNull();
        expect(component.recurringAmount.value).toBe('');
        expect(component.recurringCategoryId()).toBe('');
        expect(api.updateRecurringTransaction).not.toHaveBeenCalled();
    });

    it('does not submit the same schedule twice while saving', async () => {
        const response = new Subject<RecurringTransactionResponse>();
        api.updateRecurringTransaction.mockReturnValue(response);
        component.editRecurringTransaction(recurring());
        await component.saveRecurringTransaction();
        await component.saveRecurringTransaction();
        component.cancelRecurringEdit();
        expect(api.updateRecurringTransaction).toHaveBeenCalledTimes(1);
        expect(component.editingRecurring()).not.toBeNull();
        response.next(recurring());
        response.complete();
        expect(component.saving()).toBe(false);
    });

    it('uses the shared local date-time picker and converts its value to UTC when saving', async () => {
        fixture.componentRef.setInput('view', 'recurring');
        fixture.componentRef.setInput('embedded', true);
        component.setRecurringAccount('account-id');
        component.setRecurringCategory('food-id');
        component.recurringAmount.setValue('39,90');
        component.recurringNotificationsEnabled.set(false);
        component.setRecurringDateTime('2026-07-19T08:30');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const picker = host.querySelector('ms-date-time-picker');

        expect(picker).not.toBeNull();
        expect(
            picker
                ?.querySelector<HTMLElement>('.ms-date-time-picker__trigger-input')
                ?.textContent?.trim(),
        ).toBe('19.07.2026 08:30');

        await component.saveRecurringTransaction();

        expect(api.createRecurringTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                accountId: 'account-id',
                categoryId: 'food-id',
                amount: -39.9,
                nextOccurrenceAt: new Date(2026, 6, 19, 8, 30).toISOString(),
            }),
        );
    });

    it('blocks recurring save when the visible local date-time is incomplete', async () => {
        fixture.componentRef.setInput('view', 'recurring');
        fixture.componentRef.setInput('embedded', true);
        component.setRecurringAccount('account-id');
        component.setRecurringCategory('food-id');
        component.recurringAmount.setValue('39,90');
        component.recurringNotificationsEnabled.set(false);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        host.querySelector<HTMLButtonElement>('.ms-date-time-picker__trigger')?.click();
        fixture.detectChanges();

        const dateInput = host.querySelector<HTMLInputElement>('.ms-date-time-picker__date-input')!;
        dateInput.value = '';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        expect(component.recurringDateTimeValid()).toBe(false);
        expect(
            host
                .querySelector<HTMLElement>('.planning-form--recurring > ms-button')
                ?.getAttribute('aria-disabled'),
        ).toBe('true');

        await component.saveRecurringTransaction();

        expect(api.createRecurringTransaction).not.toHaveBeenCalled();
        expect(pushNotifications.enable).not.toHaveBeenCalled();
        expect(component.message()).toContain('дату следующей операции');
    });

    it('exposes only the confirmation as modal while a recurring dialog is underneath', () => {
        fixture.componentRef.setInput('view', 'recurring');
        component.recurringTransactions.set([recurring()]);
        component.openRecurringPlanning();
        fixture.detectChanges();

        component.deleteRecurringTransaction(recurring());
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const recurringDialog = host.querySelector<HTMLElement>('.planning-recurring-dialog');
        const confirmationDialog = host.querySelector<HTMLElement>('.planning-confirm-dialog');

        expect(recurringDialog?.getAttribute('aria-modal')).toBeNull();
        expect(recurringDialog?.getAttribute('aria-hidden')).toBe('true');
        expect(recurringDialog?.hasAttribute('inert')).toBe(true);
        expect(confirmationDialog?.getAttribute('aria-modal')).toBe('true');
        const confirmationButtons = Array.from(
            confirmationDialog?.querySelectorAll<HTMLElement>(
                '.planning-confirm-dialog__actions ms-button',
            ) ?? [],
        );

        expect(confirmationButtons).toHaveLength(2);
        expect(
            confirmationButtons.every((button) => button.classList.contains('ms-btn-full-width')),
        ).toBe(true);
        expect(confirmationButtons[0].classList.contains('ms-btn-ghost')).toBe(true);
        expect(confirmationButtons[1].classList.contains('ms-btn-danger')).toBe(true);
        expect(
            confirmationDialog?.querySelector('.planning-confirm-dialog__icon--danger'),
        ).not.toBeNull();

        component.closeConfirmation();
        fixture.detectChanges();

        expect(recurringDialog?.getAttribute('aria-modal')).toBe('true');
        expect(recurringDialog?.getAttribute('aria-hidden')).toBeNull();
        expect(recurringDialog?.hasAttribute('inert')).toBe(false);
    });

    it('loads only the API required by the selected compact view', () => {
        api.getBudgets.mockClear();
        api.getRecurringTransactions.mockClear();

        fixture.componentRef.setInput('view', 'recurring');
        fixture.detectChanges();

        expect(api.getBudgets).not.toHaveBeenCalled();
        expect(api.getRecurringTransactions).toHaveBeenCalledTimes(1);

        api.getBudgets.mockClear();
        api.getRecurringTransactions.mockClear();
        fixture.componentRef.setInput('view', 'budgets');
        fixture.detectChanges();

        expect(api.getBudgets).toHaveBeenCalledTimes(1);
        expect(api.getRecurringTransactions).not.toHaveBeenCalled();
    });
});
