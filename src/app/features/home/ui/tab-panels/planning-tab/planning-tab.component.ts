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
    ImportTransactionRowRequest,
    RecurrenceFrequency,
    RecurringTransactionResponse,
} from '../../../data-access/home-api.models';
import { HomeApiService } from '../../../data-access/home-api.service';
import { CategoryBreakdownItem } from '../../home-page.models';
import { formatMoney } from '../../home-formatters';
import {
    createCsvImportBatchId,
    normalizeCategoryName,
    parseTransactionsCsv,
    ParsedCsvRow,
} from './planning-csv.utils';
import {
    csvDateToUtc,
    deviceTimeZone,
    localInputToUtc,
    toLocalDateTimeInputValue,
} from './planning-time.utils';

type RecurringKind = 'expense' | 'income';
type PlanningView = 'imports' | 'budgets' | 'recurring';

interface PreparedImportRow {
    row: ParsedCsvRow;
    request: ImportTransactionRowRequest | null;
    issue: string | null;
}

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
    private static readonly MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
    private static readonly MAX_IMPORT_ROWS = 500;
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
    readonly importMessage = signal('');
    readonly parsedImportRows = signal<ReadonlyArray<ParsedCsvRow>>([]);
    readonly importFileName = signal('');
    readonly importBatchId = signal('');
    readonly csvDialogOpen = signal(false);
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
    readonly importAccountId = signal('');

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
    readonly preparedImportRows = computed<ReadonlyArray<PreparedImportRow>>(() => {
        const categories = [...this.expenseCategories(), ...this.incomeCategories()];

        return this.parsedImportRows().map((row) => {
            if (row.issue || row.amount === null) {
                return {
                    row,
                    request: null,
                    issue: row.issue ?? 'Некорректная сумма.',
                };
            }

            const matchingCategories = categories.filter(
                (item) =>
                    normalizeCategoryName(item.name) === normalizeCategoryName(row.categoryName),
            );
            const date = csvDateToUtc(row.date);

            if (!matchingCategories.length) {
                return { row, request: null, issue: `Не найдена категория «${row.categoryName}».` };
            }

            if (matchingCategories.length > 1) {
                return {
                    row,
                    request: null,
                    issue: `Название «${row.categoryName}» соответствует нескольким категориям. Уточните название категории в CSV.`,
                };
            }

            if (!date) {
                return { row, request: null, issue: 'Некорректная дата.' };
            }

            const category = matchingCategories[0];

            return {
                row,
                issue: null,
                request: {
                    sourceRow: row.sourceRow,
                    categoryId: category.id,
                    amount:
                        category.type === 'expense' ? -Math.abs(row.amount) : Math.abs(row.amount),
                    date,
                    description: row.description,
                },
            };
        });
    });
    readonly readyImportRows = computed(() =>
        this.preparedImportRows()
            .map((item) => item.request)
            .filter((item): item is ImportTransactionRowRequest => item !== null),
    );
    readonly invalidImportRowCount = computed(
        () => this.preparedImportRows().length - this.readyImportRows().length,
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
            if (view !== 'imports') {
                this.csvDialogOpen.set(false);
            }
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

    setImportAccount(value: string): void {
        this.importAccountId.set(value);
    }

    openCsvImport(): void {
        if (this.view() === 'imports') {
            this.csvDialogOpen.set(true);
        }
    }

    closeCsvImport(): void {
        this.csvDialogOpen.set(false);
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

    async selectImportFile(event: Event): Promise<void> {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
            return;
        }

        try {
            const file = input.files[0];
            if (file.size > PlanningTabComponent.MAX_IMPORT_FILE_BYTES) {
                throw new Error('CSV-файл слишком большой. Максимальный размер — 2 МБ.');
            }

            const source = await file.text();
            const rows = parseTransactionsCsv(source);
            if (rows.length > PlanningTabComponent.MAX_IMPORT_ROWS) {
                throw new Error(
                    `В одном файле может быть не более ${PlanningTabComponent.MAX_IMPORT_ROWS} строк.`,
                );
            }

            this.parsedImportRows.set(rows);
            this.importFileName.set(file.name);
            this.importBatchId.set(await createCsvImportBatchId(source));
            const invalidCount = rows.filter((row) => row.issue !== null).length;
            this.importMessage.set(
                invalidCount
                    ? `Найдено строк с ошибками: ${invalidCount}. Они видны в предпросмотре и не будут импортированы.`
                    : 'Все строки готовы. Сумма получит знак по типу категории.',
            );
        } catch (error) {
            this.parsedImportRows.set([]);
            this.importFileName.set('');
            this.importBatchId.set('');
            this.importMessage.set(
                error instanceof Error ? error.message : 'Не удалось прочитать CSV.',
            );
        } finally {
            input.value = '';
        }
    }

    importCsv(): void {
        const accountId = this.importAccountId();
        const importBatchId = this.importBatchId();
        const rows = this.readyImportRows();

        if (!accountId || !importBatchId || rows.length === 0) {
            this.importMessage.set('Выберите счёт и исправьте строки, отмеченные в предпросмотре.');
            return;
        }

        const invalidCount = this.invalidImportRowCount();
        if (invalidCount > 0) {
            this.requestConfirmation(
                'Импортировать только валидные строки?',
                `${rows.length} строк будут импортированы, ${invalidCount} строк с ошибками — пропущены.`,
                'Импортировать',
                false,
                () => this.performCsvImport(accountId, importBatchId, rows),
            );
            return;
        }

        this.performCsvImport(accountId, importBatchId, rows);
    }

    private performCsvImport(
        accountId: string,
        importBatchId: string,
        rows: ImportTransactionRowRequest[],
    ): void {
        this.saving.set(true);
        this.api
            .importTransactions({ accountId, importBatchId, rows })
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: (result) => {
                    const details = [
                        `Добавлено: ${result.importedCount}.`,
                        result.skippedDuplicateCount
                            ? `Пропущено дублей: ${result.skippedDuplicateCount}.`
                            : '',
                        result.issues.length ? `Строк с ошибками: ${result.issues.length}.` : '',
                        result.issues.length
                            ? `Проверьте: ${result.issues
                                  .slice(0, 5)
                                  .map((issue) => `#${issue.sourceRow}: ${issue.message}`)
                                  .join('; ')}${result.issues.length > 5 ? '; …' : ''}`
                            : '',
                    ]
                        .filter(Boolean)
                        .join(' ');
                    this.importMessage.set(details);
                    this.transactionsChanged.emit();
                },
                error: () =>
                    this.importMessage.set(
                        'Импорт не выполнен. Проверьте данные и повторите попытку.',
                    ),
            });
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
