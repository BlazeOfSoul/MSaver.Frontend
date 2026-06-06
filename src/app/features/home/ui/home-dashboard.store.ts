import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, map, of, switchMap, finalize } from 'rxjs';
import {
    AccountResponse,
    CategoryResponse,
    CategoryType,
    MonthBalanceResponse,
    PagedResponse,
    TagDetailsResponse,
    TagResponse,
    TransactionResponse,
} from '../data-access/home-api.models';
import { HomeApiService } from '../data-access/home-api.service';
import { MsSelectOption } from '../../../shared/ui/select/select';
import {
    AccountBalanceItem,
    AnalyticsMetricCard,
    AnalyticsSeriesPoint,
    AnalyticsStackedPoint,
    CategoryBreakdownItem,
    HomeSummaryCard,
    HomeTabId,
    TagGroupItem,
    TransactionDraft,
    TransactionItem,
    TransferDraft,
} from './home-page.models';
import { ACCOUNT_COLORS, CATEGORY_COLORS } from './home-page.constants';
import { getApiFieldError, toFriendlyApiError } from '../../../core/api-error.utils';
import {
    addMonths,
    apiMonthKey,
    compactMonthLabel,
    getYearMonths,
    monthKey,
    monthLabel,
    startOfMonth,
    startOfYear,
    toApiDate,
    toIsoDate,
} from './home-date.utils';
import { formatMoney } from './home-formatters';
import {
    categoryTotals,
    isExpenseCategory,
    mapAccount,
    mapCategories,
    mapTags,
    mapTransaction,
} from './home-page.mappers';

const FRIENDLY_LOAD_ERROR_MESSAGE =
    'Не получилось загрузить данные. Проверьте подключение и попробуйте ещё раз.';
const PRIMARY_ACCOUNT_NAME = 'Основной счёт';

interface DashboardPayload {
    accounts: AccountResponse[];
    categories: CategoryResponse[];
    tags: TagDetailsResponse[];
    transactions: TransactionResponse[];
    yearTransactions: TransactionResponse[];
    yearBalances: MonthBalanceResponse[];
    exchangeRatesByAccountId: Map<string, number>;
}

@Injectable()
export class HomeDashboardStore {
    private readonly homeApi = inject(HomeApiService);
    private readonly destroyRef = inject(DestroyRef);

    readonly activeTab = signal<HomeTabId>('overview');
    readonly selectedMonth = signal(startOfMonth(new Date()));
    readonly selectedAccountId = signal('all');
    readonly searchQuery = signal('');
    readonly accountSearchQuery = signal('');
    readonly categorySearchQuery = signal('');
    readonly isLoading = signal(false);
    readonly isSaving = signal(false);
    readonly isTransferRateLoading = signal(false);
    readonly hasLoaded = signal(false);
    readonly errorMessage = signal('');
    readonly accountNameError = signal('');
    readonly transferRateError = signal('');
    readonly isTransactionDialogOpen = signal(false);
    readonly newAccountName = signal('');
    readonly newAccountCurrency = signal('BYN');
    readonly newIncomeCategory = signal('');
    readonly newExpenseCategory = signal('');
    readonly newIncomeCategoryColor = signal(CATEGORY_COLORS[0]);
    readonly newExpenseCategoryColor = signal(CATEGORY_COLORS[2] ?? CATEGORY_COLORS[0]);
    readonly newTagGroup = signal('');
    readonly transferDraft = signal<TransferDraft>({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        rate: null,
        description: '',
    });
    readonly transactionDraft = signal<TransactionDraft>(this.getEmptyTransactionDraft());

    private readonly accountResponses = signal<AccountResponse[]>([]);
    private readonly categoryResponses = signal<CategoryResponse[]>([]);
    private readonly tagDetailsResponses = signal<TagDetailsResponse[]>([]);
    private readonly transactionResponses = signal<TransactionResponse[]>([]);
    private readonly yearTransactionResponses = signal<TransactionResponse[]>([]);
    private readonly yearBalanceResponses = signal<MonthBalanceResponse[]>([]);
    private readonly exchangeRatesByAccountId = signal(new Map<string, number>());

    readonly monthLabel = computed(() => monthLabel(this.selectedMonth()));
    readonly applicationCurrencyCode = computed(() =>
        this.resolveApplicationCurrencyCode(this.accountResponses()),
    );
    readonly isServerEmpty = computed(() => !!this.errorMessage() && !this.hasLoaded());
    readonly needsAccountSetup = computed(
        () => this.hasLoaded() && !this.errorMessage() && this.accountResponses().length === 0,
    );
    readonly selectedMonthBalanceByAccountId = computed(() => {
        const selected = this.selectedMonth();
        const key = monthKey(selected);

        return new Map(
            this.yearBalanceResponses()
                .filter((balance) => apiMonthKey(balance.year, balance.month) === key)
                .map((balance) => [balance.accountId, balance] as const),
        );
    });

    readonly accounts = computed<AccountBalanceItem[]>(() =>
        this.sortAccounts(this.accountResponses()).map((account, index) =>
            mapAccount(account, index, this.selectedMonthBalanceByAccountId().get(account.id)),
        ),
    );
    readonly visibleAccounts = computed(() =>
        this.accounts().filter(
            (item) => this.selectedAccountId() === 'all' || item.id === this.selectedAccountId(),
        ),
    );
    readonly accountList = computed(() =>
        this.filterByQuery(
            this.visibleAccounts(),
            (item) => `${item.name} ${item.currencyCode} ${item.currencyLabel}`,
            this.accountSearchQuery(),
        ),
    );
    readonly transactions = computed<TransactionItem[]>(() =>
        this.transactionResponses().map((transaction) => mapTransaction(transaction)),
    );
    readonly filteredTransactions = computed(() =>
        this.filterByQuery(
            this.transactions(),
            (item) => `${item.title} ${item.category} ${item.description} ${item.accountName}`,
        ),
    );
    readonly incomeCategories = computed<CategoryBreakdownItem[]>(() =>
        mapCategories(
            this.categoryResponses(),
            this.transactionResponses(),
            'income',
            this.applicationCurrencyCode(),
            (transaction) => Math.abs(this.convertTransactionAmount(transaction)),
        ),
    );
    readonly expenseCategories = computed<CategoryBreakdownItem[]>(() =>
        mapCategories(
            this.categoryResponses(),
            this.transactionResponses(),
            'expense',
            this.applicationCurrencyCode(),
            (transaction) => Math.abs(this.convertTransactionAmount(transaction)),
        ),
    );
    readonly filteredIncomeCategories = computed(() =>
        this.filterByQuery(
            this.incomeCategories(),
            (item) => item.name,
            this.categorySearchQuery(),
        ),
    );
    readonly filteredExpenseCategories = computed(() =>
        this.filterByQuery(
            this.expenseCategories(),
            (item) => item.name,
            this.categorySearchQuery(),
        ),
    );
    readonly allCategoryOptions = computed<MsSelectOption[]>(() =>
        this.categoryResponses()
            .filter((category) => category.type === 'Credit' || category.type === 'Debit')
            .map((category) => ({ value: category.id, label: category.name, color: category.color })),
    );
    readonly tagGroups = computed<TagGroupItem[]>(() => mapTags(this.tagDetailsResponses()));
    readonly filteredTagGroups = computed(() =>
        this.filterByQuery(
            this.tagGroups(),
            (item) => `${item.name} ${item.categories.map((category) => category.name).join(' ')}`,
            this.categorySearchQuery(),
        ),
    );
    readonly toolbarAccountOptions = computed<MsSelectOption[]>(() => [
        { value: 'all', label: 'Все счета' },
        ...this.accounts().map((account) => ({ value: account.id, label: account.name })),
    ]);
    readonly accountOptions = computed<MsSelectOption[]>(() =>
        this.accounts().map((account) => ({
            value: account.id,
            label: `${account.name} (${account.currencyLabel})`,
        })),
    );
    readonly incomeCategoryOptions = computed<MsSelectOption[]>(() =>
        this.incomeCategories().map((category) => ({
            value: category.id,
            label: category.name,
            color: category.color,
        })),
    );
    readonly expenseCategoryOptions = computed<MsSelectOption[]>(() =>
        this.expenseCategories().map((category) => ({
            value: category.id,
            label: category.name,
            color: category.color,
        })),
    );
    readonly totalBalance = computed(() =>
        this.visibleAccounts().reduce(
            (sum, account) => sum + this.convertAccountAmount(account.id, account.balanceValue),
            0,
        ),
    );
    readonly incomeTotal = computed(() =>
        this.transactionResponses()
            .filter((item) => !isExpenseCategory(item.category.type))
            .reduce((sum, item) => sum + Math.abs(this.convertTransactionAmount(item)), 0),
    );
    readonly expenseTotal = computed(() =>
        this.transactionResponses()
            .filter((item) => isExpenseCategory(item.category.type))
            .reduce((sum, item) => sum + Math.abs(this.convertTransactionAmount(item)), 0),
    );
    readonly incomeVsExpense = computed<ReadonlyArray<AnalyticsStackedPoint>>(() =>
        this.monthsForSelectedYear().map((month) => {
            const transactions = this.transactionsForMonth(month);

            return {
                label: compactMonthLabel(month),
                income: transactions
                    .filter((item) => !isExpenseCategory(item.category.type))
                    .reduce((sum, item) => sum + Math.abs(this.convertTransactionAmount(item)), 0),
                expense: transactions
                    .filter((item) => isExpenseCategory(item.category.type))
                    .reduce((sum, item) => sum + Math.abs(this.convertTransactionAmount(item)), 0),
            };
        }),
    );
    readonly monthlyExpensesChart = computed<ReadonlyArray<AnalyticsSeriesPoint>>(() =>
        this.incomeVsExpense().map((item) => ({ label: item.label, value: item.expense })),
    );
    readonly balanceDynamicsChart = computed<ReadonlyArray<AnalyticsSeriesPoint>>(() =>
        this.monthsForSelectedYear().map((month) => {
            const key = monthKey(month);
            const value = this.yearBalanceResponses()
                .filter((balance) => apiMonthKey(balance.year, balance.month) === key)
                .filter(
                    (balance) =>
                        this.selectedAccountId() === 'all' ||
                        balance.accountId === this.selectedAccountId(),
                )
                .reduce(
                    (sum, balance) =>
                        sum + this.convertAccountAmount(balance.accountId, balance.closingBalance),
                    0,
                );

            return {
                label: compactMonthLabel(month),
                value,
            };
        }),
    );
    readonly tagExpensesChart = computed<ReadonlyArray<CategoryBreakdownItem>>(() => {
        const totals = categoryTotals(
            this.yearTransactionResponses().filter((transaction) =>
                isExpenseCategory(transaction.category.type),
            ),
            (transaction) => Math.abs(this.convertTransactionAmount(transaction)),
        );
        const tagGroups = this.tagGroups();
        const max = Math.max(
            1,
            ...tagGroups.map((tag) =>
                tag.categories.reduce((sum, category) => sum + (totals.get(category.id) ?? 0), 0),
            ),
        );

        return tagGroups
            .map((tag) => {
                const amountValue = tag.categories.reduce(
                    (sum, category) => sum + (totals.get(category.id) ?? 0),
                    0,
                );

                return {
                    id: tag.id,
                    name: tag.name,
                    amount: formatMoney(amountValue, this.applicationCurrencyCode()),
                    amountValue,
                    progress: Math.round((amountValue / max) * 100),
                    color: tag.color,
                    type: 'expense' as const,
                    tone: 'warning' as const,
                };
            })
            .filter((item) => item.amountValue > 0);
    });
    readonly topExpensesChart = computed<ReadonlyArray<CategoryBreakdownItem>>(() =>
        [...this.expenseCategories()].sort((a, b) => b.amountValue - a.amountValue).slice(0, 5),
    );
    readonly yearStatsChart = computed<ReadonlyArray<AnalyticsMetricCard>>(() => {
        const income = this.incomeVsExpense().reduce((sum, item) => sum + item.income, 0);
        const expense = this.incomeVsExpense().reduce((sum, item) => sum + item.expense, 0);

        return [
            {
                id: 'year-income',
                label: 'Доходы года',
                value: formatMoney(income, this.applicationCurrencyCode()),
                caption: `${this.selectedMonth().getFullYear()} год`,
            },
            {
                id: 'year-expense',
                label: 'Расходы года',
                value: formatMoney(expense, this.applicationCurrencyCode()),
                caption: `${this.selectedMonth().getFullYear()} год`,
            },
        ];
    });
    readonly analyticsMetrics = computed<ReadonlyArray<AnalyticsMetricCard>>(() => {
        const income = this.incomeTotal();
        const expense = this.expenseTotal();
        const net = income - expense;

        return [
            {
                id: 'metric-income',
                label: 'Доходы',
                value: formatMoney(income, this.applicationCurrencyCode()),
                caption: 'Поступления за выбранный период',
            },
            {
                id: 'metric-expense',
                label: 'Расходы',
                value: formatMoney(expense, this.applicationCurrencyCode()),
                caption: 'Списания за выбранный период',
            },
            {
                id: 'metric-net',
                label: 'Чистый итог',
                value: formatMoney(net, this.applicationCurrencyCode()),
                caption: net >= 0 ? 'Период закрывается в плюс' : 'Расходы выше доходов',
            },
            {
                id: 'metric-balance',
                label: 'Баланс',
                value: formatMoney(this.totalBalance(), this.applicationCurrencyCode()),
                caption: 'Закрывающий баланс выбранного месяца',
            },
        ];
    });
    readonly summaryCards = computed<ReadonlyArray<HomeSummaryCard>>(() => [
        {
            id: 'balance',
            label: 'Баланс',
            value: formatMoney(this.totalBalance(), this.applicationCurrencyCode()),
            helper: 'Сводный баланс',
            tone: 'primary',
            icon: 'account_balance_wallet',
        },
        {
            id: 'income',
            label: 'Доходы',
            value: `+${formatMoney(this.incomeTotal(), this.applicationCurrencyCode())}`,
            helper: 'За выбранный месяц',
            tone: 'positive',
            icon: 'south_west',
        },
        {
            id: 'expense',
            label: 'Расходы',
            value: `-${formatMoney(this.expenseTotal(), this.applicationCurrencyCode())}`,
            helper: 'За выбранный месяц',
            tone: 'negative',
            icon: 'north_east',
        },
        {
            id: 'operations',
            label: 'Операции',
            value: `${this.filteredTransactions().length}`,
            helper: 'За выбранный период',
            tone: 'neutral',
            icon: 'receipt_long',
        },
    ]);
    readonly activeTabTitle = computed(() => {
        switch (this.activeTab()) {
            case 'accounts':
                return 'Счета';
            case 'analytics':
                return 'Аналитика';
            case 'categories':
                return 'Категории';
            case 'settings':
                return 'Настройки';
            default:
                return 'Транзакции';
        }
    });
    readonly activeTabDescription = computed(() => {
        switch (this.activeTab()) {
            case 'accounts':
                return 'Баланс выбранного месяца, счета и переводы между ними.';
            case 'analytics':
                return 'Графики по доходам, расходам, категориям, тегам и годовому движению.';
            case 'categories':
                return 'Управление категориями доходов, расходов и тегами аналитики.';
            case 'settings':
                return 'Основная валюта, стартовые значения и параметры рабочего кабинета.';
            default:
                return 'Главная вкладка показывает транзакции выбранного месяца.';
        }
    });

    loadDashboard(showLoader = true): void {
        if (showLoader) {
            this.isLoading.set(true);
        }

        this.errorMessage.set('');

        this.loadDashboardPayload()
            .pipe(
                finalize(() => {
                    if (showLoader) {
                        this.isLoading.set(false);
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (payload) => this.setPayload(payload),
                error: (error) => {
                    this.clearPayload();
                    this.errorMessage.set(toFriendlyApiError(error, FRIENDLY_LOAD_ERROR_MESSAGE));
                    this.hasLoaded.set(false);
                },
            });
    }

    setActiveTab(tab: HomeTabId): void {
        this.activeTab.set(tab);
    }

    setSearchQuery(value: string): void {
        this.searchQuery.set(value);
    }

    setAccountSearchQuery(value: string): void {
        this.accountSearchQuery.set(value);
    }

    setCategorySearchQuery(value: string): void {
        this.categorySearchQuery.set(value);
    }

    dismissError(): void {
        this.errorMessage.set('');
    }

    setAccountFilter(accountId: string): void {
        this.selectedAccountId.set(accountId);
        this.loadDashboard(false);
    }

    goToPreviousMonth(): void {
        this.selectedMonth.update((value) => addMonths(value, -1));
        this.loadDashboard();
    }

    goToNextMonth(): void {
        this.selectedMonth.update((value) => addMonths(value, 1));
        this.loadDashboard();
    }

    startAddingTransaction(): void {
        this.activeTab.set('overview');
        this.transactionDraft.set(this.getDefaultTransactionDraft());
        this.isTransactionDialogOpen.set(true);
    }

    closeTransactionDialog(): void {
        this.isTransactionDialogOpen.set(false);
    }

    updateTransactionDraft(draft: TransactionDraft): void {
        const validCategories =
            draft.type === 'income' ? this.incomeCategoryOptions() : this.expenseCategoryOptions();
        const nextCategoryId =
            validCategories.some((option) => option.value === draft.categoryId) && draft.categoryId
                ? draft.categoryId
                : (validCategories[0]?.value ?? '');

        this.transactionDraft.set({ ...draft, categoryId: nextCategoryId });
    }

    saveTransaction(): void {
        const draft = this.transactionDraft();

        if (!draft.accountId || !draft.categoryId || !draft.amount || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.createTransaction({
                accountId: draft.accountId,
                categoryId: draft.categoryId,
                amount: draft.type === 'income' ? Math.abs(draft.amount) : -Math.abs(draft.amount),
                date: toApiDate(draft.date),
                description: draft.description.trim(),
            }),
            'Не удалось добавить транзакцию.',
            () => {
                this.isTransactionDialogOpen.set(false);
                this.transactionDraft.set(this.getDefaultTransactionDraft());
                this.loadDashboard(false);
            },
        );
    }

    deleteTransaction(transactionId: string): void {
        this.runMutation(
            this.homeApi.deleteTransaction(transactionId),
            'Не удалось удалить транзакцию.',
            () => this.loadDashboard(false),
        );
    }

    updateTransferDraft(draft: TransferDraft): void {
        const previous = this.transferDraft();
        this.transferDraft.set(draft);

        if (
            previous.fromAccountId !== draft.fromAccountId ||
            previous.toAccountId !== draft.toAccountId
        ) {
            this.prefillTransferRate(draft);
        }
    }

    transferBetweenAccounts(): void {
        const draft = this.transferDraft();
        const fromAccount = this.accounts().find((account) => account.id === draft.fromAccountId);
        const toAccount = this.accounts().find((account) => account.id === draft.toAccountId);

        if (
            !draft.amount ||
            !fromAccount ||
            !toAccount ||
            draft.fromAccountId === draft.toAccountId ||
            this.isSaving()
        ) {
            return;
        }

        const usesSameCurrency = fromAccount.currencyCode === toAccount.currencyCode;
        const rate = usesSameCurrency ? null : draft.rate && draft.rate > 0 ? draft.rate : null;
        const description = draft.description.trim() || 'Перевод между счетами';

        this.runMutation(
            this.homeApi.createTransfer({
                fromAccountId: draft.fromAccountId,
                toAccountId: draft.toAccountId,
                amount: Math.abs(draft.amount),
                date: this.defaultDateForSelectedMonth(),
                rate,
                description,
            }),
            'Не получилось выполнить перевод. Проверьте счета, сумму и курс.',
            () => {
                this.transferDraft.update((value) => ({
                    ...value,
                    amount: 0,
                    rate: null,
                    description: '',
                }));
                this.loadDashboard(false);
            },
        );
    }

    setNewAccountName(value: string): void {
        this.newAccountName.set(value);
        this.accountNameError.set('');
    }

    setNewAccountCurrency(value: string): void {
        this.newAccountCurrency.set(value);
    }

    createPrimaryAccount(): void {
        if (this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.createAccount({
                name: PRIMARY_ACCOUNT_NAME,
                currencyCode: this.newAccountCurrency(),
                color: ACCOUNT_COLORS[0],
            }),
            'Не получилось создать основной счёт. Проверьте валюту и попробуйте ещё раз.',
            () => {
                this.newAccountName.set('');
                this.accountNameError.set('');
                this.loadDashboard(false);
            },
        );
    }

    createNewAccount(): void {
        const name = this.newAccountName().trim();

        if (!name || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.createAccount({
                name,
                currencyCode: this.newAccountCurrency(),
                color: ACCOUNT_COLORS[this.accounts().length % ACCOUNT_COLORS.length],
            }),
            'Не удалось создать счёт.',
            () => {
                this.newAccountName.set('');
                this.accountNameError.set('');
                this.loadDashboard(false);
            },
            (error) => {
                this.accountNameError.set(
                    getApiFieldError(error, 'name') ||
                        toFriendlyApiError(error, 'Не удалось создать счёт.'),
                );
            },
        );
    }

    deleteAccount(accountId: string): void {
        this.runMutation(this.homeApi.deleteAccount(accountId), 'Не удалось удалить счёт.', () =>
            this.loadDashboard(false),
        );
    }

    setNewIncomeCategory(value: string): void {
        this.newIncomeCategory.set(value);
    }

    setNewExpenseCategory(value: string): void {
        this.newExpenseCategory.set(value);
    }

    setNewIncomeCategoryColor(value: string): void {
        this.newIncomeCategoryColor.set(value);
    }

    setNewExpenseCategoryColor(value: string): void {
        this.newExpenseCategoryColor.set(value);
    }

    setNewTagGroup(value: string): void {
        this.newTagGroup.set(value);
    }

    addIncomeCategory(): void {
        this.createCategory(this.newIncomeCategory(), 'Credit', this.newIncomeCategoryColor());
    }

    addExpenseCategory(): void {
        this.createCategory(this.newExpenseCategory(), 'Debit', this.newExpenseCategoryColor());
    }

    deleteCategory(categoryId: string): void {
        this.runMutation(
            this.homeApi.deleteCategory(categoryId),
            'Не удалось удалить категорию.',
            () => this.loadDashboard(false),
        );
    }

    addTagGroup(): void {
        const name = this.newTagGroup().trim();

        if (!name || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.createTag({
                name,
                color: CATEGORY_COLORS[this.tagGroups().length % CATEGORY_COLORS.length],
            }),
            'Не удалось создать тег.',
            () => {
                this.newTagGroup.set('');
                this.reloadTags();
            },
        );
    }

    deleteTag(tagId: string): void {
        this.runMutation(this.homeApi.deleteTag(tagId), 'Не удалось удалить тег.', () =>
            this.reloadTags(),
        );
    }

    assignCategoryToTag(tagId: string, categoryId: string): void {
        if (!categoryId) {
            return;
        }

        const tag = this.tagGroups().find((item) => item.id === tagId);
        const categoryIds = new Set(tag?.categories.map((category) => category.id) ?? []);
        categoryIds.add(categoryId);

        this.assignTagCategories(tagId, [...categoryIds]);
    }

    removeCategoryFromTag(tagId: string, categoryId: string): void {
        const tag = this.tagGroups().find((item) => item.id === tagId);
        const categoryIds = (tag?.categories ?? [])
            .map((category) => category.id)
            .filter((id) => id !== categoryId);

        this.assignTagCategories(tagId, categoryIds);
    }

    private loadDashboardPayload() {
        return this.loadAccounts().pipe(
            switchMap((accounts) => {
                const yearMonths = this.monthsForSelectedYear();

                return forkJoin({
                    exchangeRatesByAccountId: this.loadApplicationExchangeRates(accounts),
                    categories: this.loadCategories(),
                    tagDetails: this.loadTagDetails(),
                    transactions: this.loadTransactions(this.transactionQuery()),
                    yearTransactions: this.loadTransactions(this.yearTransactionQuery()),
                    yearBalances: this.loadMonthBalances(accounts, yearMonths),
                }).pipe(
                    map(
                        ({
                            exchangeRatesByAccountId,
                            categories,
                            tagDetails,
                            transactions,
                            yearTransactions,
                            yearBalances,
                        }): DashboardPayload => ({
                            accounts,
                            categories,
                            tags: tagDetails,
                            transactions,
                            yearTransactions,
                            yearBalances,
                            exchangeRatesByAccountId,
                        }),
                    ),
                );
            }),
        );
    }

    private loadAccounts() {
        return this.loadAllPages<AccountResponse>((page) => this.homeApi.getAccounts({ page }));
    }

    private loadCategories() {
        return this.loadAllPages<CategoryResponse>((page) => this.homeApi.getCategories({ page }));
    }

    private loadTagDetails() {
        return this.loadAllPages<TagResponse>((page) => this.homeApi.getTags({ page })).pipe(
            switchMap((tags) => {
                if (!tags.length) {
                    return of<TagDetailsResponse[]>([]);
                }

                return forkJoin(tags.map((tag) => this.toTagDetails(tag)));
            }),
        );
    }

    private loadTransactions(query: { accountId?: string; fromDate: string; toDate: string }) {
        return this.loadAllPages<TransactionResponse>((page) =>
            this.homeApi.getTransactions({ ...query, page }),
        );
    }

    private loadApplicationExchangeRates(accounts: AccountResponse[]) {
        const applicationAccount = this.resolveApplicationAccount(accounts);

        if (!applicationAccount) {
            return of(new Map<string, number>());
        }

        const requests = accounts.map((account) => {
            if (account.id === applicationAccount.id || account.currencyCode === applicationAccount.currencyCode) {
                return of([account.id, 1] as const);
            }

            return this.homeApi
                .getTransferRate(account.id, applicationAccount.id)
                .pipe(map((response) => [account.id, response.rate] as const));
        });

        return forkJoin(requests).pipe(map((entries) => new Map<string, number>(entries)));
    }

    private loadAllPages<T>(
        loadPage: (page: number) => Observable<PagedResponse<T>>,
    ): Observable<T[]> {
        return loadPage(1).pipe(
            switchMap((firstPage) => {
                if (firstPage.totalPages <= 1) {
                    return of(firstPage.items);
                }

                const rest = Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
                    loadPage(index + 2),
                );

                return forkJoin(rest).pipe(
                    map((pages) => [firstPage, ...pages].flatMap((page) => page.items)),
                );
            }),
        );
    }

    private toTagDetails(tag: TagResponse) {
        return this.homeApi.getTagById(tag.id);
    }

    private loadMonthBalances(accounts: AccountResponse[], months: Date[]) {
        const requests = accounts.flatMap((account) =>
            months.map((month) =>
                this.homeApi.getMonthBalance(account.id, month.getFullYear(), month.getMonth() + 1),
            ),
        );

        if (!requests.length) {
            return of<MonthBalanceResponse[]>([]);
        }

        return forkJoin(requests);
    }

    private setPayload(payload: DashboardPayload): void {
        this.accountResponses.set(payload.accounts);
        this.exchangeRatesByAccountId.set(payload.exchangeRatesByAccountId);
        this.categoryResponses.set(payload.categories);
        this.tagDetailsResponses.set(payload.tags);
        this.transactionResponses.set(payload.transactions);
        this.yearTransactionResponses.set(payload.yearTransactions);
        this.yearBalanceResponses.set(payload.yearBalances);
        this.hasLoaded.set(true);
        this.ensureSelectedAccountExists();
        this.ensureDraftDefaults();
    }

    private clearPayload(): void {
        this.accountResponses.set([]);
        this.categoryResponses.set([]);
        this.tagDetailsResponses.set([]);
        this.transactionResponses.set([]);
        this.yearTransactionResponses.set([]);
        this.yearBalanceResponses.set([]);
        this.exchangeRatesByAccountId.set(new Map<string, number>());
    }

    private createCategory(nameValue: string, type: CategoryType, color: string): void {
        const name = nameValue.trim();

        if (!name || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.createCategory({
                name,
                type,
                color,
            }),
            'Не удалось создать категорию.',
            () => {
                if (type === 'Credit') {
                    this.newIncomeCategory.set('');
                } else {
                    this.newExpenseCategory.set('');
                }

                this.loadDashboard(false);
            },
        );
    }

    private assignTagCategories(tagId: string, categoryIds: string[]): void {
        this.runMutation(
            this.homeApi.assignTagCategories(tagId, { categoryIds }),
            'Не удалось обновить категории тега.',
            () => this.reloadTags(),
        );
    }

    private reloadTags(): void {
        this.loadTagDetails()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (tags) => this.tagDetailsResponses.set(tags),
                error: (error) =>
                    this.errorMessage.set(
                        toFriendlyApiError(
                            error,
                            'Не удалось обновить теги. Проверьте подключение и попробуйте ещё раз.',
                        ),
                    ),
            });
    }

    private runMutation<T>(
        request$: Observable<T>,
        errorMessage: string,
        onSuccess: () => void,
        onError?: (error: unknown) => void,
    ): void {
        if (this.isSaving()) {
            return;
        }

        this.isSaving.set(true);
        this.errorMessage.set('');

        request$
            .pipe(
                finalize(() => this.isSaving.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: onSuccess,
                error: (error) => {
                    const friendlyMessage = toFriendlyApiError(error, errorMessage);
                    this.errorMessage.set(friendlyMessage);
                    onError?.(error);
                },
            });
    }

    private prefillTransferRate(draft: TransferDraft): void {
        const fromAccount = this.accounts().find((account) => account.id === draft.fromAccountId);
        const toAccount = this.accounts().find((account) => account.id === draft.toAccountId);

        this.transferRateError.set('');

        if (!fromAccount || !toAccount || draft.fromAccountId === draft.toAccountId) {
            return;
        }

        if (fromAccount.currencyCode === toAccount.currencyCode) {
            this.transferDraft.update((value) => ({
                ...value,
                rate: null,
            }));
            return;
        }

        this.isTransferRateLoading.set(true);

        this.homeApi
            .getTransferRate(draft.fromAccountId, draft.toAccountId)
            .pipe(
                finalize(() => this.isTransferRateLoading.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (response) => {
                    const current = this.transferDraft();

                    if (
                        current.fromAccountId !== draft.fromAccountId ||
                        current.toAccountId !== draft.toAccountId
                    ) {
                        return;
                    }

                    this.transferDraft.set({
                        ...current,
                        rate: response.rate,
                    });
                },
                error: (error) => {
                    const message = toFriendlyApiError(
                        error,
                        'Не удалось получить курс. Можно указать курс вручную.',
                    );
                    this.transferRateError.set(message);
                    this.errorMessage.set(message);
                },
            });
    }

    private convertTransactionAmount(transaction: TransactionResponse): number {
        return this.convertAccountAmount(transaction.account.id, transaction.amount);
    }

    private convertAccountAmount(accountId: string, amount: number): number {
        const rate = this.exchangeRatesByAccountId().get(accountId) ?? 1;

        return amount * rate;
    }

    private resolveApplicationAccount(accounts: AccountResponse[]): AccountResponse | undefined {
        return this.sortAccounts(accounts)[0];
    }

    private resolveApplicationCurrencyCode(accounts: AccountResponse[]): string {
        return this.resolveApplicationAccount(accounts)?.currencyCode ?? 'BYN';
    }

    private sortAccounts(accounts: ReadonlyArray<AccountResponse>): AccountResponse[] {
        return [...accounts].sort((left, right) => {
            if (left.isPrimary !== right.isPrimary) {
                return left.isPrimary ? -1 : 1;
            }

            return left.name.localeCompare(right.name, 'ru');
        });
    }

    private ensureSelectedAccountExists(): void {
        const selectedAccountId = this.selectedAccountId();

        if (
            selectedAccountId !== 'all' &&
            !this.accountResponses().some((account) => account.id === selectedAccountId)
        ) {
            this.selectedAccountId.set('all');
        }
    }

    private ensureDraftDefaults(): void {
        const draft = this.transactionDraft();
        const accounts = this.accounts();
        const categories =
            draft.type === 'income' ? this.incomeCategoryOptions() : this.expenseCategoryOptions();

        this.transactionDraft.set({
            ...draft,
            accountId: accounts.some((account) => account.id === draft.accountId)
                ? draft.accountId
                : (accounts[0]?.id ?? ''),
            categoryId: categories.some((category) => category.value === draft.categoryId)
                ? draft.categoryId
                : (categories[0]?.value ?? ''),
        });

        const accountOptions = this.accountOptions();
        const transferDraft = this.transferDraft();
        const nextTransferDraft = {
            fromAccountId: accountOptions.some(
                (option) => option.value === transferDraft.fromAccountId,
            )
                ? transferDraft.fromAccountId
                : (accountOptions[0]?.value ?? ''),
            toAccountId: accountOptions.some((option) => option.value === transferDraft.toAccountId)
                ? transferDraft.toAccountId
                : (accountOptions[1]?.value ?? accountOptions[0]?.value ?? ''),
            amount: transferDraft.amount,
            rate: transferDraft.rate,
            description: transferDraft.description,
        };

        this.transferDraft.set(nextTransferDraft);

        if (
            nextTransferDraft.fromAccountId &&
            nextTransferDraft.toAccountId &&
            (!nextTransferDraft.rate ||
                transferDraft.fromAccountId !== nextTransferDraft.fromAccountId ||
                transferDraft.toAccountId !== nextTransferDraft.toAccountId)
        ) {
            this.prefillTransferRate(nextTransferDraft);
        }
    }

    private filterByQuery<T>(
        items: ReadonlyArray<T>,
        pickText: (item: T) => string,
        rawQuery = this.searchQuery(),
    ): T[] {
        const query = rawQuery.trim().toLowerCase();

        if (!query) {
            return [...items];
        }

        return items.filter((item) => pickText(item).toLowerCase().includes(query));
    }

    private transactionsForMonth(month: Date): TransactionResponse[] {
        const key = monthKey(month);

        return this.yearTransactionResponses().filter(
            (transaction) => monthKey(new Date(transaction.date)) === key,
        );
    }

    private transactionQuery(): { accountId?: string; fromDate: string; toDate: string } {
        const monthStart = this.selectedMonth();
        const nextMonthStart = addMonths(monthStart, 1);
        const selectedAccountId = this.selectedAccountId();

        return {
            accountId: selectedAccountId === 'all' ? undefined : selectedAccountId,
            fromDate: toIsoDate(monthStart),
            toDate: toIsoDate(nextMonthStart),
        };
    }

    private yearTransactionQuery(): {
        accountId?: string;
        fromDate: string;
        toDate: string;
    } {
        const yearStart = startOfYear(this.selectedMonth());
        const nextYearStart = addMonths(yearStart, 12);
        const selectedAccountId = this.selectedAccountId();

        return {
            accountId: selectedAccountId === 'all' ? undefined : selectedAccountId,
            fromDate: toIsoDate(yearStart),
            toDate: toIsoDate(nextYearStart),
        };
    }

    private monthsForSelectedYear(): Date[] {
        return getYearMonths(this.selectedMonth());
    }

    private getDefaultTransactionDraft(): TransactionDraft {
        const accounts = this.accounts();
        const categories = this.incomeCategoryOptions();

        return {
            type: 'income',
            accountId: accounts[0]?.id ?? '',
            categoryId: categories[0]?.value ?? '',
            amount: 0,
            date: this.defaultDateForSelectedMonth(),
            description: '',
        };
    }

    private getEmptyTransactionDraft(): TransactionDraft {
        return {
            type: 'income',
            accountId: '',
            categoryId: '',
            amount: 0,
            date: toIsoDate(new Date()),
            description: '',
        };
    }

    private defaultDateForSelectedMonth(): string {
        const selectedMonth = this.selectedMonth();
        const today = new Date();

        if (
            selectedMonth.getFullYear() === today.getFullYear() &&
            selectedMonth.getMonth() === today.getMonth()
        ) {
            return toIsoDate(today);
        }

        return toIsoDate(selectedMonth);
    }
}
