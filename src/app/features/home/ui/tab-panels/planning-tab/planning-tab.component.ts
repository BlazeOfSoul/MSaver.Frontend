import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize, timer } from 'rxjs';
import { PwaPushNotificationService } from '../../../../../core/push/pwa-push-notification.service';
import { DateTimePickerComponent } from '../../../../../shared/ui/date-time-picker/date-time-picker';
import { DialogShellComponent } from '../../../../../shared/ui/dialog-shell/dialog-shell';
import { parseMoneyInputAmount } from '../../../../../shared/utils/money-input.utils';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import {
    BudgetItemResponse,
    RecurrenceFrequency,
    RecurringTransactionResponse,
} from '../../../data-access/home-api.models';
import { HomeApiService } from '../../../data-access/home-api.service';
import { CategoryBreakdownItem } from '../../home-page.models';
import { formatMoney } from '../../home-formatters';
import { deviceTimeZone, localInputToUtc, toLocalDateTimeInputValue } from './planning-time.utils';

type RecurringKind = 'expense' | 'income';
type PlanningView = 'budgets' | 'recurring';

interface PendingConfirmation {
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    action: () => void;
}

@Component({
    selector: 'ms-planning-tab',
    standalone: true,
    imports: [
        NgTemplateOutlet,
        ReactiveFormsModule,
        Button,
        DateTimePickerComponent,
        DialogShellComponent,
        InputComponent,
        SelectComponent,
    ],
    templateUrl: './planning-tab.component.html',
    styleUrls: [
        './planning-tab.component.css',
        './planning-tab.part-2.css',
        './planning-tab.part-3.css',
        './planning-tab.part-4.css',
        './planning-tab.part-5.css',
        './planning-tab.part-6.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningTabComponent {
    private static readonly CLOCK_REFRESH_INTERVAL_MS = 30_000;

    private readonly api = inject(HomeApiService);
    private readonly pushNotifications = inject(PwaPushNotificationService);
    private budgetRequestId = 0;
    private recurringRequestId = 0;

    month = input.required<Date>();
    view = input<PlanningView>('budgets');
    embedded = input(false);
    accounts = input.required<ReadonlyArray<MsSelectOption>>();
    expenseCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    incomeCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    transactionsChanged = output<void>();

    readonly budgets = signal<ReadonlyArray<BudgetItemResponse>>([]);
    readonly recurringTransactions = signal<ReadonlyArray<RecurringTransactionResponse>>([]);
    readonly budgetLoading = signal(false);
    readonly recurringLoading = signal(false);
    readonly saving = signal(false);
    readonly message = signal('');
    readonly recurringDialogOpen = signal(false);
    readonly pendingConfirmation = signal<PendingConfirmation | null>(null);
    readonly currentTime = signal(Date.now());
    readonly Math = Math;

    readonly budgetAccountId = signal('');
    readonly budgetCategoryId = signal('');
    readonly recurringAccountId = signal('');
    readonly recurringCategoryId = signal('');
    readonly recurringKind = signal<RecurringKind>('expense');
    readonly recurringFrequency = signal<RecurrenceFrequency>('Monthly');
    readonly recurringNotificationsEnabled = signal(true);
    readonly recurringDateTime = signal(toLocalDateTimeInputValue(new Date()));
    readonly recurringDateTimeValid = signal(true);

    readonly budgetAmount = new FormControl('', { nonNullable: true });
    readonly recurringAmount = new FormControl('', { nonNullable: true });
    readonly recurringDescription = new FormControl('', { nonNullable: true });

    readonly expenseCategoryOptions = computed<ReadonlyArray<MsSelectOption>>(() =>
        this.expenseCategories().map((item) => ({
            value: item.id,
            label: item.name,
            color: item.color,
        })),
    );
    readonly incomeCategoryOptions = computed<ReadonlyArray<MsSelectOption>>(() =>
        this.incomeCategories().map((item) => ({
            value: item.id,
            label: item.name,
            color: item.color,
        })),
    );
    readonly recurringCategoryOptions = computed(() =>
        this.recurringKind() === 'expense'
            ? this.expenseCategoryOptions()
            : this.incomeCategoryOptions(),
    );
    readonly activeRecurringTransactions = computed(() =>
        this.recurringTransactions().filter((item) => item.isActive),
    );
    readonly nextRecurringTransaction = computed(() =>
        this.activeRecurringTransactions().reduce<RecurringTransactionResponse | null>(
            (next, item) =>
                !next ||
                new Date(item.nextOccurrenceAt).getTime() <
                    new Date(next.nextOccurrenceAt).getTime()
                    ? item
                    : next,
            null,
        ),
    );
    readonly dueRecurringCount = computed(
        () => this.activeRecurringTransactions().filter((item) => this.isDue(item)).length,
    );

    constructor() {
        effect((onCleanup) => {
            if (this.view() !== 'recurring') {
                return;
            }

            const clock = timer(0, PlanningTabComponent.CLOCK_REFRESH_INTERVAL_MS).subscribe(() =>
                this.currentTime.set(Date.now()),
            );
            onCleanup(() => clock.unsubscribe());
        });

        effect(() => {
            const view = this.view();
            if (view !== 'recurring') {
                this.recurringDialogOpen.set(false);
            }
            if (this.embedded()) {
                this.recurringDialogOpen.set(false);
            }

            if (view === 'budgets') {
                this.loadBudgetsForSelectedMonth();
                return;
            }

            if (view === 'recurring') {
                this.loadRecurringTransactions();
            }
        });
    }

    setBudgetAccount(value: string): void {
        this.budgetAccountId.set(value);
    }

    setBudgetCategory(value: string): void {
        this.budgetCategoryId.set(value);
    }

    setRecurringAccount(value: string): void {
        this.recurringAccountId.set(value);
    }

    setRecurringKind(value: string): void {
        if (value !== 'expense' && value !== 'income') {
            return;
        }

        this.recurringKind.set(value);
        this.recurringCategoryId.set('');
    }

    setRecurringCategory(value: string): void {
        this.recurringCategoryId.set(value);
    }

    setRecurringFrequency(value: string): void {
        if (value === 'Weekly' || value === 'Monthly') {
            this.recurringFrequency.set(value);
        }
    }

    setRecurringDateTime(value: string): void {
        this.recurringDateTime.set(value);
        this.recurringDateTimeValid.set(localInputToUtc(value) !== null);
    }

    setRecurringDateTimeValidity(valid: boolean): void {
        this.recurringDateTimeValid.set(valid);
    }

    openRecurringPlanning(): void {
        if (this.view() === 'recurring') {
            this.recurringDialogOpen.set(true);
        }
    }

    closeRecurringPlanning(): void {
        this.recurringDialogOpen.set(false);
    }

    closeConfirmation(): void {
        this.pendingConfirmation.set(null);
    }

    confirmPendingAction(): void {
        const confirmation = this.pendingConfirmation();
        if (!confirmation) {
            return;
        }

        this.pendingConfirmation.set(null);
        confirmation.action();
    }

    saveBudget(): void {
        const amount = parseMoneyInputAmount(this.budgetAmount.value);
        const accountId = this.budgetAccountId();
        const categoryId = this.budgetCategoryId();

        if (!accountId || !categoryId || !Number.isFinite(amount) || amount <= 0) {
            this.message.set('Выберите счёт, категорию и укажите лимит больше нуля.');
            return;
        }

        const month = this.month();
        this.save(
            this.api.upsertBudget({
                accountId,
                categoryId,
                year: month.getFullYear(),
                month: month.getMonth() + 1,
                amount,
                timeZoneId: deviceTimeZone(),
            }),
            () => {
                this.budgetAmount.setValue('');
                this.message.set('Бюджет сохранён.');
                this.loadBudgets();
            },
        );
    }

    deleteBudget(item: BudgetItemResponse): void {
        this.requestConfirmation(
            'Удалить бюджет?',
            `Лимит категории «${item.categoryName}» за выбранный месяц будет удалён.`,
            'Удалить',
            true,
            () => {
                const month = this.month();
                this.save(
                    this.api.deleteBudget({
                        accountId: item.accountId,
                        categoryId: item.categoryId,
                        year: month.getFullYear(),
                        month: month.getMonth() + 1,
                    }),
                    () => this.loadBudgets(),
                );
            },
        );
    }

    async saveRecurringTransaction(): Promise<void> {
        const amount = parseMoneyInputAmount(this.recurringAmount.value);
        const nextOccurrenceAt = this.recurringDateTimeValid()
            ? localInputToUtc(this.recurringDateTime())
            : null;
        const accountId = this.recurringAccountId();
        const categoryId = this.recurringCategoryId();

        if (
            !accountId ||
            !categoryId ||
            !nextOccurrenceAt ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            this.message.set('Заполните счёт, категорию, сумму и дату следующей операции.');
            return;
        }

        if (this.recurringNotificationsEnabled()) {
            this.saving.set(true);
            const status = await this.pushNotifications.enable();
            this.saving.set(false);
            if (status !== 'enabled') {
                this.message.set(this.notificationStatusMessage(status));
                return;
            }
        }

        this.save(
            this.api.createRecurringTransaction({
                accountId,
                categoryId,
                amount: this.recurringKind() === 'expense' ? -amount : amount,
                description: this.recurringDescription.value,
                frequency: this.recurringFrequency(),
                nextOccurrenceAt,
                timeZoneId: deviceTimeZone(),
                notificationsEnabled: this.recurringNotificationsEnabled(),
            }),
            () => {
                this.recurringAmount.setValue('');
                this.recurringDescription.setValue('');
                this.message.set('Повторяющаяся операция добавлена.');
                this.loadRecurringTransactions();
            },
        );
    }

    completeRecurringTransaction(item: RecurringTransactionResponse): void {
        this.save(this.api.completeRecurringTransaction(item.id), () => {
            this.message.set('Операция подтверждена и добавлена в журнал.');
            this.loadRecurringTransactions();
            this.transactionsChanged.emit();
        });
    }

    skipRecurringTransaction(item: RecurringTransactionResponse): void {
        if (!this.isDue(item)) {
            return;
        }

        this.requestConfirmation(
            'Пропустить операцию?',
            `«${item.description || item.categoryName}» не будет добавлена в журнал. Расписание перейдёт к следующей дате.`,
            'Пропустить',
            false,
            () => {
                this.save(this.api.skipRecurringTransaction(item.id), () => {
                    this.message.set(
                        'Текущая операция пропущена. Расписание перенесено на следующую дату.',
                    );
                    this.loadRecurringTransactions();
                });
            },
        );
    }

    deleteRecurringTransaction(item: RecurringTransactionResponse): void {
        this.requestConfirmation(
            'Удалить расписание?',
            `Будущие операции «${item.description || item.categoryName}» больше не будут появляться.`,
            'Удалить',
            true,
            () => {
                this.save(this.api.deleteRecurringTransaction(item.id), () => {
                    this.message.set('Расписание удалено.');
                    this.loadRecurringTransactions();
                });
            },
        );
    }

    formatAmount(value: number, currencyCode: string): string {
        return formatMoney(value, currencyCode);
    }

    formatOccurrence(value: string): string {
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    }

    isDue(item: RecurringTransactionResponse): boolean {
        return new Date(item.nextOccurrenceAt).getTime() <= this.currentTime();
    }

    private requestConfirmation(
        title: string,
        message: string,
        confirmLabel: string,
        danger: boolean,
        action: () => void,
    ): void {
        this.pendingConfirmation.set({
            title,
            message,
            confirmLabel,
            danger,
            action,
        });
    }

    private loadBudgets(): void {
        const requestId = ++this.budgetRequestId;
        const month = this.month();
        this.budgetLoading.set(true);
        this.api
            .getBudgets(month.getFullYear(), month.getMonth() + 1, deviceTimeZone())
            .pipe(
                finalize(() => {
                    if (requestId === this.budgetRequestId) {
                        this.budgetLoading.set(false);
                    }
                }),
            )
            .subscribe({
                next: (response) => {
                    if (requestId === this.budgetRequestId) {
                        this.budgets.set(response.items);
                    }
                },
                error: () => {
                    if (requestId === this.budgetRequestId) {
                        this.message.set('Не удалось загрузить бюджеты. Повторите попытку.');
                    }
                },
            });
    }

    private loadBudgetsForSelectedMonth(): void {
        this.month();
        this.loadBudgets();
    }

    private loadRecurringTransactions(): void {
        const requestId = ++this.recurringRequestId;
        this.recurringLoading.set(true);
        this.api
            .getRecurringTransactions()
            .pipe(
                finalize(() => {
                    if (requestId === this.recurringRequestId) {
                        this.recurringLoading.set(false);
                    }
                }),
            )
            .subscribe({
                next: (items) => {
                    if (requestId === this.recurringRequestId) {
                        this.recurringTransactions.set(items);
                    }
                },
                error: () => {
                    if (requestId === this.recurringRequestId) {
                        this.message.set(
                            'Не удалось загрузить повторяющиеся операции. Повторите попытку.',
                        );
                    }
                },
            });
    }

    private notificationStatusMessage(
        status: Awaited<ReturnType<PwaPushNotificationService['enable']>>,
    ): string {
        return {
            enabled: 'Уведомления включены для этого устройства.',
            denied: 'Уведомления заблокированы в настройках браузера.',
            unsupported: 'Этот браузер не поддерживает PWA-уведомления.',
            'not-configured': 'Push-ключи ещё не настроены на сервере.',
            failed: 'Не удалось включить уведомления. Повторите попытку.',
        }[status];
    }

    private save(source: ReturnType<HomeApiService['upsertBudget']>, complete: () => void): void {
        this.saving.set(true);
        source.pipe(finalize(() => this.saving.set(false))).subscribe({
            next: complete,
            error: () => this.message.set('Не удалось сохранить изменения. Попробуйте ещё раз.'),
        });
    }
}
