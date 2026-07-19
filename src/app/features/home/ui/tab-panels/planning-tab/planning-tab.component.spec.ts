import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PwaPushNotificationService } from '../../../../../core/push/pwa-push-notification.service';
import {
    BudgetItemResponse,
    ImportTransactionsResponse,
    RecurringTransactionResponse,
} from '../../../data-access/home-api.models';
import { HomeApiService } from '../../../data-access/home-api.service';
import { CategoryBreakdownItem } from '../../home-page.models';
import { parseTransactionsCsv } from './planning-csv.utils';
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
        importTransactions: ReturnType<typeof vi.fn>;
        upsertBudget: ReturnType<typeof vi.fn>;
        deleteBudget: ReturnType<typeof vi.fn>;
        createRecurringTransaction: ReturnType<typeof vi.fn>;
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
            importTransactions: vi.fn(() =>
                of<ImportTransactionsResponse>({
                    importedCount: 1,
                    skippedDuplicateCount: 0,
                    issues: [],
                }),
            ),
            upsertBudget: vi.fn(() => of(undefined)),
            deleteBudget: vi.fn(() => of(undefined)),
            createRecurringTransaction: vi.fn(() => of(recurring())),
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

    it('keeps invalid CSV rows in preview and imports only valid rows after confirmation', () => {
        fixture.componentRef.setInput('view', 'imports');
        component.parsedImportRows.set(
            parseTransactionsCsv(
                [
                    'date,amount,description,category',
                    '2026-07-01,25,Lunch,Food',
                    '2026-07-02,invalid,Bad amount,Food',
                    '2026-07-03,15,Unknown category,Travel',
                ].join('\n'),
            ),
        );
        component.importBatchId.set('a'.repeat(64));
        component.setImportAccount('account-id');
        component.openCsvImport();
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelectorAll('.import-preview__row')).toHaveLength(3);
        expect(host.querySelectorAll('.import-preview__row--invalid')).toHaveLength(2);
        expect(component.readyImportRows()).toHaveLength(1);
        expect(component.invalidImportRowCount()).toBe(2);

        component.importCsv();

        expect(component.pendingConfirmation()?.message).toContain('1');
        expect(api.importTransactions).not.toHaveBeenCalled();
        component.confirmPendingAction();

        expect(api.importTransactions).toHaveBeenCalledWith({
            accountId: 'account-id',
            importBatchId: 'a'.repeat(64),
            rows: [
                expect.objectContaining({
                    sourceRow: 2,
                    categoryId: 'food-id',
                    amount: -25,
                    description: 'Lunch',
                }),
            ],
        });
    });

    it('does not import a partial CSV when the user cancels confirmation', () => {
        fixture.componentRef.setInput('view', 'imports');
        component.parsedImportRows.set(
            parseTransactionsCsv(
                [
                    'date,amount,description,category',
                    '2026-07-01,25,Lunch,Food',
                    '2026-07-02,invalid,Bad amount,Food',
                ].join('\n'),
            ),
        );
        component.importBatchId.set('a'.repeat(64));
        component.setImportAccount('account-id');

        component.importCsv();
        component.closeConfirmation();

        expect(component.pendingConfirmation()).toBeNull();
        expect(api.importTransactions).not.toHaveBeenCalled();
    });

    it('rejects ambiguous normalized category names instead of assigning a silent type', () => {
        fixture.componentRef.setInput('view', 'imports');
        fixture.componentRef.setInput('expenseCategories', [
            category({ id: 'expense-e', name: 'Все' }),
        ]);
        fixture.componentRef.setInput('incomeCategories', [
            category({ id: 'income-yo', name: 'Всё', type: 'income' }),
        ]);
        component.parsedImportRows.set(
            parseTransactionsCsv(
                ['date,amount,description,category', '2026-07-01,25,Ambiguous,ВСЁ'].join('\n'),
            ),
        );
        fixture.detectChanges();

        expect(component.readyImportRows()).toHaveLength(0);
        expect(component.invalidImportRowCount()).toBe(1);
        expect(component.preparedImportRows()[0].issue).toContain(
            'соответствует нескольким категориям',
        );
    });

    it('marks only due occurrences as confirmable', () => {
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

        expect(component.isDue(due)).toBe(true);
        expect(component.isDue(future)).toBe(false);

        const rows = Array.from(
            (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.recurring-row'),
        );
        expect(rows[0].classList.contains('recurring-row--due')).toBe(true);
        expect(rows[1].classList.contains('recurring-row--due')).toBe(false);
        expect(
            rows[1]
                .querySelector<HTMLElement>('.recurring-row__actions ms-button')
                ?.getAttribute('aria-disabled'),
        ).toBe('true');
    });

    it('makes an occurrence due on the clock tick and stops the clock after destroy', async () => {
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
                '.recurring-row__actions ms-button',
            );

        expect(confirmButton()?.getAttribute('aria-disabled')).toBe('true');

        await vi.advanceTimersByTimeAsync(30_000);
        fixture.detectChanges();

        expect(component.currentTime()).toBe(start.getTime() + 30_000);
        expect(confirmButton()?.getAttribute('aria-disabled')).toBe('false');
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

    it('shows budgets without mixing CSV import into the budget view', () => {
        component.budgets.set([budget()]);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelector('.budget-row--over')).not.toBeNull();
        expect(host.querySelector('.recurring-row')).toBeNull();
        expect(host.querySelector('.planning-import-dialog')).toBeNull();

        component.openCsvImport();
        fixture.detectChanges();

        expect(host.querySelector('.planning-import-dialog')).toBeNull();
        expect(
            host.querySelector('.budget-row ms-button.ms-btn-outline.ms-btn-danger'),
        ).not.toBeNull();
        expect(
            host.querySelector('.budget-row ms-button .material-symbols-outlined')?.textContent,
        ).toContain('delete');
    });

    it('shows CSV import as a compact launcher and opens it in a dialog', () => {
        fixture.componentRef.setInput('view', 'imports');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelector('.planning-launcher')).not.toBeNull();
        expect(host.textContent).toContain('Импорт CSV');
        expect(host.querySelector('.budget-row')).toBeNull();
        expect(host.querySelector('.planning-import-dialog')).toBeNull();

        component.openCsvImport();
        fixture.detectChanges();

        expect(host.querySelector('.planning-import-dialog')).not.toBeNull();
        expect(host.querySelector('.planning-import-controls ms-button')?.textContent?.trim()).toBe(
            'Импортировать',
        );
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

        component.openCsvImport();
        fixture.detectChanges();
        expect(host.querySelector('.planning-import-dialog')).toBeNull();
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

        component.closeConfirmation();
        fixture.detectChanges();

        expect(recurringDialog?.getAttribute('aria-modal')).toBe('true');
        expect(recurringDialog?.getAttribute('aria-hidden')).toBeNull();
        expect(recurringDialog?.hasAttribute('inert')).toBe(false);
    });

    it('exposes only the confirmation as modal while a CSV dialog is underneath', () => {
        fixture.componentRef.setInput('view', 'imports');
        component.parsedImportRows.set(
            parseTransactionsCsv(
                [
                    'date,amount,description,category',
                    '2026-07-01,25,Lunch,Food',
                    '2026-07-02,invalid,Bad amount,Food',
                ].join('\n'),
            ),
        );
        component.importBatchId.set('a'.repeat(64));
        component.setImportAccount('account-id');
        component.openCsvImport();
        component.importCsv();
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const importDialog = host.querySelector<HTMLElement>('.planning-import-dialog');
        const confirmationDialog = host.querySelector<HTMLElement>('.planning-confirm-dialog');

        expect(importDialog?.getAttribute('aria-modal')).toBeNull();
        expect(importDialog?.getAttribute('aria-hidden')).toBe('true');
        expect(importDialog?.hasAttribute('inert')).toBe(true);
        expect(confirmationDialog?.getAttribute('aria-modal')).toBe('true');
    });

    it('loads only the API required by the selected compact view', () => {
        api.getBudgets.mockClear();
        api.getRecurringTransactions.mockClear();

        fixture.componentRef.setInput('view', 'imports');
        fixture.detectChanges();

        expect(api.getBudgets).not.toHaveBeenCalled();
        expect(api.getRecurringTransactions).not.toHaveBeenCalled();

        fixture.componentRef.setInput('view', 'recurring');
        fixture.detectChanges();

        expect(api.getBudgets).not.toHaveBeenCalled();
        expect(api.getRecurringTransactions).toHaveBeenCalledTimes(1);
    });
});
