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

const SERVER_ERROR_MESSAGE =
    'Сервер недоступен или вернул ошибку. Проверьте backend и попробуйте обновить данные.';
interface DashboardPayload {
    accounts: AccountResponse[];
    categories: CategoryResponse[];
    tags: TagDetailsResponse[];
    transactions: TransactionResponse[];
    yearTransactions: TransactionResponse[];
    yearBalances: MonthBalanceResponse[];
}

@Injectable()
export class HomeDashboardStore {
    private readonly homeApi = inject(HomeApiService);
    private readonly destroyRef = inject(DestroyRef);

    readonly activeTab = signal<HomeTabId>('overview');
    readonly selectedMonth = signal(startOfMonth(new Date()));
    readonly selectedAccountId = signal('all');
    readonly searchQuery = signal('');
    readonly isLoading = signal(false);
    readonly isSaving = signal(false);
    readonly hasLoaded = signal(false);
    readonly errorMessage = signal('');
    readonly isTransactionDialogOpen = signal(false);
    readonly newAccountName = signal('');
    readonly newAccountCurrency = signal('BYN');
    readonly newIncomeCategory = signal('');
    readonly newExpenseCategory = signal('');
    readonly newTagGroup = signal('');
    readonly transferDraft = signal<TransferDraft>({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
    });
    readonly transactionDraft = signal<TransactionDraft>(this.getEmptyTransactionDraft());

    private readonly accountResponses = signal<AccountResponse[]>([]);
    private readonly categoryResponses = signal<CategoryResponse[]>([]);
    private readonly tagDetailsResponses = signal<TagDetailsResponse[]>([]);
    private readonly transactionResponses = signal<TransactionResponse[]>([]);
    private readonly yearTransactionResponses = signal<TransactionResponse[]>([]);
    private readonly yearBalanceResponses = signal<MonthBalanceResponse[]>([]);

    readonly monthLabel = computed(() => monthLabel(this.selectedMonth()));
    readonly isServerEmpty = computed(() => !!this.errorMessage() && !this.hasLoaded());
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
        this.accountResponses().map((account, index) =>
            mapAccount(account, index, this.selectedMonthBalanceByAccountId().get(account.id)),
        ),
    );
    readonly visibleAccounts = computed(() =>
        this.accounts().filter(
            (item) => this.selectedAccountId() === 'all' || item.id === this.selectedAccountId(),
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
        mapCategories(this.categoryResponses(), this.transactionResponses(), 'income'),
    );
    readonly expenseCategories = computed<CategoryBreakdownItem[]>(() =>
        mapCategories(this.categoryResponses(), this.transactionResponses(), 'expense'),
    );
    readonly allCategoryOptions = computed<MsSelectOption[]>(() =>
        this.categoryResponses()
            .filter((category) => category.type === 'Credit' || category.type === 'Debit')
            .map((category) => ({ value: category.id, label: category.name })),
    );
    readonly tagGroups = computed<TagGroupItem[]>(() => mapTags(this.tagDetailsResponses()));
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
        this.incomeCategories().map((category) => ({ value: category.id, label: category.name })),
    );
    readonly expenseCategoryOptions = computed<MsSelectOption[]>(() =>
        this.expenseCategories().map((category) => ({ value: category.id, label: category.name })),
    );
    readonly totalBalance = computed(() =>
        this.visibleAccounts().reduce((sum, account) => sum + account.balanceValue, 0),
    );
    readonly incomeTotal = computed(() =>
        this.transactionResponses()
            .filter((item) => !isExpenseCategory(item.category.type))
            .reduce((sum, item) => sum + Math.abs(item.amount), 0),
    );
    readonly expenseTotal = computed(() =>
        this.transactionResponses()
            .filter((item) => isExpenseCategory(item.category.type))
            .reduce((sum, item) => sum + Math.abs(item.amount), 0),
    );
    readonly incomeVsExpense = computed<ReadonlyArray<AnalyticsStackedPoint>>(() =>
        this.monthsForSelectedYear().map((month) => {
            const transactions = this.transactionsForMonth(month);

            return {
                label: compactMonthLabel(month),
                income: transactions
                    .filter((item) => !isExpenseCategory(item.category.type))
                    .reduce((sum, item) => sum + Math.abs(item.amount), 0),
                expense: transactions
                    .filter((item) => isExpenseCategory(item.category.type))
                    .reduce((sum, item) => sum + Math.abs(item.amount), 0),
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
                .reduce((sum, balance) => sum + balance.closingBalance, 0);

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
                    amount: formatMoney(amountValue, 'BYN'),
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
                value: formatMoney(income, 'BYN'),
                caption: `${this.selectedMonth().getFullYear()} год`,
            },
            {
                id: 'year-expense',
                label: 'Расходы года',
                value: formatMoney(expense, 'BYN'),
                caption: `${this.selectedMonth().getFullYear()} год`,
            },
        ];
    });
    readonly analyticsMetrics = computed<ReadonlyArray<AnalyticsMetricCard>>(() => [
        {
            id: 'metric-transactions',
            label: 'Транзакции',
            value: `${this.filteredTransactions().length}`,
            caption: 'Операции за выбранный месяц',
        },
        {
            id: 'metric-accounts',
            label: 'Счета',
            value: `${this.visibleAccounts().length}`,
            caption: 'Активные счета из API',
        },
        {
            id: 'metric-categories',
            label: 'Категории',
            value: `${this.incomeCategories().length + this.expenseCategories().length}`,
            caption: 'Доходные и расходные категории',
        },
        {
            id: 'metric-balance',
            label: 'Баланс',
            value: formatMoney(this.totalBalance(), 'BYN'),
            caption: 'Закрывающий баланс выбранного месяца',
        },
    ]);
    readonly summaryCards = computed<ReadonlyArray<HomeSummaryCard>>(() => [
        {
            id: 'balance',
            label: 'Баланс',
            value: formatMoney(this.totalBalance(), 'BYN'),
            helper: `${this.visibleAccounts().length} активных счетов`,
            tone: 'primary',
            icon: 'account_balance_wallet',
        },
        {
            id: 'income',
            label: 'Доходы',
            value: `+${formatMoney(this.incomeTotal(), 'BYN')}`,
            helper: 'За выбранный месяц',
            tone: 'positive',
            icon: 'south_west',
        },
        {
            id: 'expense',
            label: 'Расходы',
            value: `-${formatMoney(this.expenseTotal(), 'BYN')}`,
            helper: 'За выбранный месяц',
            tone: 'negative',
            icon: 'north_east',
        },
        {
            id: 'budget',
            label: 'Категории',
            value: `${this.expenseCategories().length}`,
            helper: 'Расходных категорий',
            tone: 'neutral',
            icon: 'savings',
        },
    ]);
    readonly recordsCount = computed(() => {
        switch (this.activeTab()) {
            case 'accounts':
                return this.visibleAccounts().length;
            case 'analytics':
                return this.analyticsMetrics().length;
            case 'categories':
                return this.expenseCategories().length + this.incomeCategories().length;
            default:
                return this.filteredTransactions().length;
        }
    });
    readonly activeTabTitle = computed(() => {
        switch (this.activeTab()) {
            case 'accounts':
                return 'Счета';
            case 'analytics':
                return 'Аналитика';
            case 'categories':
                return 'Категории';
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
                error: () => {
                    this.clearPayload();
                    this.errorMessage.set(SERVER_ERROR_MESSAGE);
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
        this.transferDraft.set(draft);
    }

    transferBetweenAccounts(): void {
        const draft = this.transferDraft();

        if (!draft.amount || draft.fromAccountId === draft.toAccountId || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.createTransfer({
                fromAccountId: draft.fromAccountId,
                toAccountId: draft.toAccountId,
                amount: Math.abs(draft.amount),
                date: this.defaultDateForSelectedMonth(),
                rate: null,
                description: 'Перевод между счетами',
            }),
            'Не удалось выполнить перевод.',
            () => {
                this.transferDraft.update((value) => ({ ...value, amount: 0 }));
                this.loadDashboard(false);
            },
        );
    }

    setNewAccountName(value: string): void {
        this.newAccountName.set(value);
    }

    setNewAccountCurrency(value: string): void {
        this.newAccountCurrency.set(value);
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
                this.loadDashboard(false);
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

    setNewTagGroup(value: string): void {
        this.newTagGroup.set(value);
    }

    addIncomeCategory(): void {
        this.createCategory(this.newIncomeCategory(), 'Credit');
    }

    addExpenseCategory(): void {
        this.createCategory(this.newExpenseCategory(), 'Debit');
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
                this.loadDashboard(false);
            },
        );
    }

    deleteTag(tagId: string): void {
        this.runMutation(this.homeApi.deleteTag(tagId), 'Не удалось удалить тег.', () =>
            this.loadDashboard(false),
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
                    categories: this.loadCategories(),
                    tagDetails: this.loadTagDetails(),
                    transactions: this.loadTransactions(this.transactionQuery()),
                    yearTransactions: this.loadTransactions(this.yearTransactionQuery()),
                    yearBalances: this.loadMonthBalances(accounts, yearMonths),
                }).pipe(
                    map(
                        ({
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
    }

    private createCategory(nameValue: string, type: CategoryType): void {
        const name = nameValue.trim();

        if (!name || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.createCategory({
                name,
                type,
                color: CATEGORY_COLORS[this.categoryResponses().length % CATEGORY_COLORS.length],
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
            () => this.loadDashboard(false),
        );
    }

    private runMutation<T>(
        request$: Observable<T>,
        errorMessage: string,
        onSuccess: () => void,
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
                error: () => this.errorMessage.set(errorMessage),
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
        this.transferDraft.set({
            fromAccountId: accountOptions.some(
                (option) => option.value === transferDraft.fromAccountId,
            )
                ? transferDraft.fromAccountId
                : (accountOptions[0]?.value ?? ''),
            toAccountId: accountOptions.some((option) => option.value === transferDraft.toAccountId)
                ? transferDraft.toAccountId
                : (accountOptions[1]?.value ?? accountOptions[0]?.value ?? ''),
            amount: transferDraft.amount,
        });
    }

    private filterByQuery<T>(items: ReadonlyArray<T>, pickText: (item: T) => string): T[] {
        const query = this.searchQuery().trim().toLowerCase();

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
