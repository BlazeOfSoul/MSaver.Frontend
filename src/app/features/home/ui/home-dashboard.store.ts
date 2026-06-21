import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    Observable,
    concatMap,
    finalize,
    forkJoin,
    from,
    map,
    of,
    range,
    reduce,
    switchMap,
} from 'rxjs';
import {
    AccountResponse,
    CategoryResponse,
    CategoryType,
    CurrentUserResponse,
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
    AnalyticsCategoryMonthRow,
    AnalyticsCategoryMonthSummary,
    AnalyticsCategoryMonthTable,
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
import { ACCOUNT_COLORS, CATEGORY_COLORS, CURRENCY_OPTIONS } from './home-page.constants';
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
    toIsoDateTimeLocal,
} from './home-date.utils';
import { formatMoney } from './home-formatters';
import { resolveHexColor, safeHexColor } from './home-color.utils';
import {
    findMissingBalanceMonths,
    keepSelectedMonthBalanceForYear,
    mergeMonthBalanceCache,
} from './home-balance-cache.utils';
import { isPositiveFiniteAmount } from './home-amount.utils';
import {
    TRANSACTION_PAGE_SIZE_OPTIONS,
    normalizeTransactionPageSize,
    readStoredTransactionPageSize,
    writeStoredTransactionPageSize,
} from './home-transaction-page-size-storage.utils';
import {
    createEmptyTransactionPage,
    mapTransactionPagination,
} from './home-transaction-pagination.utils';
import {
    DebtCategoryKind,
    DebtSummary,
    calculateDebtSummary,
    calculateDebtTotalsUntilMonth,
    resolveDebtCategoryKind,
} from './home-debt.utils';
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
const SUPPORTED_CURRENCY_CODES = new Set(CURRENCY_OPTIONS.map((option) => option.value));

function toSupportedCurrencyCode(value: string): string | null {
    const nextCode = value.trim().toUpperCase();

    return SUPPORTED_CURRENCY_CODES.has(nextCode) ? nextCode : null;
}

interface DashboardPayload {
    accounts: AccountResponse[];
    currentUser: CurrentUserResponse;
    transactionPage: PagedResponse<TransactionResponse>;
    yearTransactions: TransactionResponse[];
    yearBalances: MonthBalanceResponse[];
    exchangeRatesByAccountId: Map<string, number>;
}

@Injectable()
export class HomeDashboardStore {
    private readonly homeApi = inject(HomeApiService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly initialTransactionPageSize = readStoredTransactionPageSize();

    readonly activeTab = signal<HomeTabId>('overview');
    readonly selectedMonth = signal(startOfMonth(new Date()));
    readonly selectedAccountId = signal('all');
    readonly accountsSelectedAccountId = signal('all');
    readonly analyticsSelectedAccountId = signal('all');
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
    readonly editingTransactionId = signal<string | null>(null);
    readonly isEditingTransaction = computed(() => this.editingTransactionId() !== null);
    readonly transactionPageSize = signal(this.initialTransactionPageSize);
    readonly transactionPagination = signal(
        mapTransactionPagination(createEmptyTransactionPage(this.initialTransactionPageSize)),
    );
    readonly transactionPageSizeOptions: ReadonlyArray<MsSelectOption> =
        TRANSACTION_PAGE_SIZE_OPTIONS.map((size) => ({
            value: size.toString(),
            label: size.toString(),
        }));
    readonly newAccountName = signal('');
    readonly newAccountCurrency = signal('BYN');
    readonly newIncomeCategory = signal('');
    readonly newExpenseCategory = signal('');
    readonly newIncomeCategoryColor = signal(CATEGORY_COLORS[0]);
    readonly newExpenseCategoryColor = signal(CATEGORY_COLORS[2] ?? CATEGORY_COLORS[0]);
    readonly newTagGroup = signal('');
    readonly newTagGroupColor = signal(CATEGORY_COLORS[1] ?? CATEGORY_COLORS[0]);
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
    private readonly applicationCurrencyCodeSignal = signal('BYN');
    private readonly hasLoadedTagDetails = signal(false);
    private hasLoadedCategories = false;
    private isCategoryDataLoading = false;
    private isTagDetailsLoading = false;
    private isYearTransactionsLoading = false;
    private shouldRefreshTagDetailsAfterLoad = false;
    private areYearTransactionsStale = false;
    private isDestroyed = false;
    private loadedFullBalanceYear: number | null = null;
    private loadingYearBalanceYear: number | null = null;
    private dashboardLoadRequestId = 0;
    private yearBalanceRequestId = 0;
    private selectedMonthBalanceRequestId = 0;
    private accountDataRequestId = 0;
    private applicationExchangeRatesRequestId = 0;
    private categoryReloadRequestId = 0;
    private currentTransactionPageRequestId = 0;
    private selectedYearTransactionsRequestId = 0;
    private transferRateRequestId = 0;

    readonly monthLabel = computed(() => monthLabel(this.selectedMonth()));
    readonly applicationCurrencyCode = computed(() => this.applicationCurrencyCodeSignal());
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
    readonly primaryAccount = computed(
        () => this.accounts().find((account) => account.isPrimary) ?? this.accounts()[0],
    );
    readonly visibleAccounts = computed(() =>
        this.accounts().filter(
            (item) =>
                this.accountsSelectedAccountId() === 'all' ||
                item.id === this.accountsSelectedAccountId(),
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
    readonly selectedYearTransactions = computed(() => {
        const selectedAccountId = this.analyticsSelectedAccountId();

        if (selectedAccountId === 'all') {
            return this.yearTransactionResponses();
        }

        return this.yearTransactionResponses().filter(
            (transaction) => transaction.account.id === selectedAccountId,
        );
    });
    readonly selectedMonthTransactions = computed(() => {
        const key = monthKey(this.selectedMonth());

        return this.yearTransactionResponses().filter(
            (transaction) => monthKey(new Date(transaction.date)) === key,
        );
    });
    readonly analyticsMonthTransactions = computed(() => {
        const key = monthKey(this.selectedMonth());

        return this.selectedYearTransactions().filter(
            (transaction) => monthKey(new Date(transaction.date)) === key,
        );
    });
    readonly filteredTransactions = computed(() =>
        this.filterByQuery(
            this.transactions(),
            (item) => `${item.title} ${item.category} ${item.description} ${item.accountName}`,
        ),
    );
    readonly analyticsCurrencyCode = computed(() => {
        const selectedAccountId = this.analyticsSelectedAccountId();

        if (selectedAccountId === 'all') {
            return this.applicationCurrencyCode();
        }

        return (
            this.accounts().find((account) => account.id === selectedAccountId)?.currencyCode ??
            this.applicationCurrencyCode()
        );
    });
    readonly incomeCategories = computed<CategoryBreakdownItem[]>(() =>
        mapCategories(
            this.categoryResponses(),
            this.selectedMonthTransactions(),
            'income',
            this.applicationCurrencyCode(),
            (transaction) => Math.abs(this.convertAnalyticsTransactionAmount(transaction)),
        ),
    );
    readonly expenseCategories = computed<CategoryBreakdownItem[]>(() =>
        mapCategories(
            this.categoryResponses(),
            this.selectedMonthTransactions(),
            'expense',
            this.applicationCurrencyCode(),
            (transaction) => Math.abs(this.convertTransactionAmount(transaction)),
        ),
    );
    readonly analyticsIncomeCategories = computed<CategoryBreakdownItem[]>(() =>
        mapCategories(
            this.categoryResponses(),
            this.analyticsMonthTransactions(),
            'income',
            this.analyticsCurrencyCode(),
            (transaction) => Math.abs(this.convertAnalyticsTransactionAmount(transaction)),
        ),
    );
    readonly analyticsExpenseCategories = computed<CategoryBreakdownItem[]>(() =>
        mapCategories(
            this.categoryResponses(),
            this.analyticsMonthTransactions(),
            'expense',
            this.analyticsCurrencyCode(),
            (transaction) => Math.abs(this.convertAnalyticsTransactionAmount(transaction)),
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
            .map((category) => ({
                value: category.id,
                label: category.name,
                color: safeHexColor(category.color, CATEGORY_COLORS[0]),
            })),
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
            label: category.displayName ?? category.name,
            description: category.debtHelper,
            color: category.color,
        })),
    );
    readonly expenseCategoryOptions = computed<MsSelectOption[]>(() =>
        this.expenseCategories().map((category) => ({
            value: category.id,
            label: category.displayName ?? category.name,
            description: category.debtHelper,
            color: category.color,
        })),
    );
    readonly totalBalance = computed(() =>
        this.accounts()
            .filter(
                (account) =>
                    this.analyticsSelectedAccountId() === 'all' ||
                    account.id === this.analyticsSelectedAccountId(),
            )
            .reduce(
                (sum, account) =>
                    sum + this.convertAnalyticsAccountAmount(account.id, account.balanceValue),
                0,
            ),
    );
    readonly accountSummaryBalance = computed(() =>
        this.accounts().reduce(
            (sum, account) => sum + this.convertAccountAmount(account.id, account.balanceValue),
            0,
        ),
    );
    readonly accountSummaryBalanceLabel = computed(() =>
        formatMoney(this.accountSummaryBalance(), this.applicationCurrencyCode()),
    );
    readonly incomeTotal = computed(() =>
        this.selectedMonthTransactions()
            .filter((item) => !isExpenseCategory(item.category.type))
            .reduce((sum, item) => sum + Math.abs(this.convertTransactionAmount(item)), 0),
    );
    readonly expenseTotal = computed(() =>
        this.selectedMonthTransactions()
            .filter((item) => isExpenseCategory(item.category.type))
            .reduce((sum, item) => sum + Math.abs(this.convertTransactionAmount(item)), 0),
    );
    readonly analyticsIncomeTotal = computed(() =>
        this.analyticsMonthTransactions()
            .filter((item) => !isExpenseCategory(item.category.type))
            .reduce((sum, item) => sum + Math.abs(this.convertAnalyticsTransactionAmount(item)), 0),
    );
    readonly analyticsExpenseTotal = computed(() =>
        this.analyticsMonthTransactions()
            .filter((item) => isExpenseCategory(item.category.type))
            .reduce((sum, item) => sum + Math.abs(this.convertAnalyticsTransactionAmount(item)), 0),
    );
    readonly debtSummary = computed<DebtSummary>(() => {
        const primaryAccount = this.primaryAccount();
        const primaryBalance = primaryAccount
            ? this.convertAccountAmount(primaryAccount.id, primaryAccount.balanceValue)
            : 0;

        return calculateDebtSummary(
            this.yearTransactionResponses(),
            primaryBalance,
            (transaction) => this.convertTransactionAmount(transaction),
        );
    });
    readonly incomeVsExpense = computed<ReadonlyArray<AnalyticsStackedPoint>>(() =>
        this.monthsForSelectedYear().map((month) => {
            const transactions = this.transactionsForMonth(month);

            return {
                label: compactMonthLabel(month),
                income: transactions
                    .filter((item) => !isExpenseCategory(item.category.type))
                    .reduce(
                        (sum, item) => sum + Math.abs(this.convertAnalyticsTransactionAmount(item)),
                        0,
                    ),
                expense: transactions
                    .filter((item) => isExpenseCategory(item.category.type))
                    .reduce(
                        (sum, item) => sum + Math.abs(this.convertAnalyticsTransactionAmount(item)),
                        0,
                    ),
            };
        }),
    );
    readonly categoryMonthTable = computed<AnalyticsCategoryMonthTable>(() => {
        const months = this.monthsForSelectedYear();
        const incomeRows = this.buildCategoryMonthRows(months, 'income');
        const expenseRows = this.buildCategoryMonthRows(months, 'expense');
        const debtRows = this.buildDebtMonthRows(months);

        return {
            months: months.map((month) => compactMonthLabel(month)),
            incomeRows,
            expenseRows,
            debtRows,
            incomeSummary: this.buildMonthSummary(months, incomeRows),
            expenseSummary: this.buildMonthSummary(months, expenseRows),
            debtSummary: this.buildMonthSummary(months, debtRows, { totalFromLastCell: true }),
        };
    });
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
                        this.analyticsSelectedAccountId() === 'all' ||
                        balance.accountId === this.analyticsSelectedAccountId(),
                )
                .reduce(
                    (sum, balance) =>
                        sum +
                        this.convertAnalyticsAccountAmount(
                            balance.accountId,
                            balance.closingBalance,
                        ),
                    0,
                );

            return {
                label: compactMonthLabel(month),
                value,
            };
        }),
    );
    readonly savingsRateChart = computed<ReadonlyArray<AnalyticsSeriesPoint>>(() =>
        this.incomeVsExpense().map((item) => ({
            label: item.label,
            value:
                item.income > 0
                    ? Math.round(((item.income - item.expense) / item.income) * 100)
                    : 0,
        })),
    );
    readonly tagExpensesChart = computed<ReadonlyArray<CategoryBreakdownItem>>(() => {
        const totals = categoryTotals(
            this.selectedYearTransactions().filter((transaction) =>
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
                    amount: formatMoney(amountValue, this.analyticsCurrencyCode()),
                    amountValue,
                    progress: Math.round((amountValue / max) * 100),
                    color: tag.color,
                    type: 'expense' as const,
                    tone: 'warning' as const,
                    isSystem: false,
                };
            })
            .filter((item) => item.amountValue > 0);
    });
    readonly topExpensesChart = computed<ReadonlyArray<CategoryBreakdownItem>>(() =>
        [...this.analyticsExpenseCategories()]
            .sort((a, b) => b.amountValue - a.amountValue)
            .slice(0, 5),
    );
    readonly analyticsMetrics = computed<ReadonlyArray<AnalyticsMetricCard>>(() => {
        const income = this.analyticsIncomeTotal();
        const expense = this.analyticsExpenseTotal();
        const net = income - expense;
        const currencyCode = this.analyticsCurrencyCode();

        return [
            {
                id: 'metric-income',
                label: 'Доходы',
                value: formatMoney(income, currencyCode),
                caption: 'Поступления за выбранный период',
            },
            {
                id: 'metric-expense',
                label: 'Расходы',
                value: formatMoney(expense, currencyCode),
                caption: 'Списания за выбранный период',
            },
            {
                id: 'metric-net',
                label: 'Чистый итог',
                value: formatMoney(net, currencyCode),
                caption: net >= 0 ? 'Период закрывается в плюс' : 'Расходы выше доходов',
            },
            {
                id: 'metric-balance',
                label: 'Баланс',
                value: formatMoney(this.totalBalance(), currencyCode),
                caption: 'Закрывающий баланс выбранного месяца',
            },
        ];
    });
    readonly summaryCards = computed<ReadonlyArray<HomeSummaryCard>>(() => {
        const primaryAccount = this.primaryAccount();
        const primaryBalanceValue = primaryAccount
            ? this.convertAccountAmount(primaryAccount.id, primaryAccount.balanceValue)
            : 0;

        return [
            {
                id: 'balance',
                label: 'Баланс',
                value: formatMoney(primaryBalanceValue, this.applicationCurrencyCode()),
                helper: 'Основной счёт',
                tone: primaryBalanceValue < 0 ? 'negative' : 'primary',
                icon: 'account_balance_wallet',
            },
            {
                id: 'debt-balance',
                label: 'После долгов',
                value: formatMoney(
                    this.debtSummary().balanceAfterClosing,
                    this.applicationCurrencyCode(),
                ),
                helper: 'Баланс после закрытия долгов',
                helperLines: [
                    `Я должен: ${formatMoney(this.debtSummary().owedByMe, this.applicationCurrencyCode())}`,
                    `Мне должны: ${formatMoney(this.debtSummary().owedToMe, this.applicationCurrencyCode())}`,
                ],
                tone: 'neutral',
                icon: 'balance',
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
        ];
    });
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

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.isDestroyed = true;
            this.shouldRefreshTagDetailsAfterLoad = false;
        });
    }

    loadDashboard(showLoader = true): void {
        if (showLoader && this.isLoading()) {
            return;
        }

        if (showLoader) {
            this.isLoading.set(true);
        }

        this.errorMessage.set('');
        const requestId = ++this.dashboardLoadRequestId;

        this.loadDashboardPayload()
            .pipe(
                finalize(() => {
                    if (requestId === this.dashboardLoadRequestId) {
                        this.isLoading.set(false);
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (payload) => {
                    if (requestId !== this.dashboardLoadRequestId) {
                        return;
                    }

                    this.setPayload(payload);
                },
                error: (error) => {
                    if (requestId !== this.dashboardLoadRequestId) {
                        return;
                    }

                    this.clearPayload();
                    this.errorMessage.set(toFriendlyApiError(error, FRIENDLY_LOAD_ERROR_MESSAGE));
                    this.hasLoaded.set(false);
                },
            });
    }

    setActiveTab(tab: HomeTabId): void {
        this.activeTab.set(tab);
        this.loadCategoriesForTab(tab);
        this.loadTagDetailsForTab(tab);
        this.loadYearTransactionsForTab(tab);
        this.loadYearBalancesForTab(tab);
        this.prefillTransferRateForTab(tab);
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
        if (!this.canUseAccountFilter(accountId)) {
            return;
        }

        if (accountId === this.selectedAccountId()) {
            return;
        }

        this.selectedAccountId.set(accountId);
        this.reloadCurrentTransactionPage();
    }

    setAccountsAccountFilter(accountId: string): void {
        if (!this.canUseAccountFilter(accountId)) {
            return;
        }

        this.accountsSelectedAccountId.set(accountId);
    }

    setAnalyticsAccountFilter(accountId: string): void {
        if (!this.canUseAccountFilter(accountId)) {
            return;
        }

        this.analyticsSelectedAccountId.set(accountId);
    }

    setTransactionPageSize(size: number): void {
        const nextSize = normalizeTransactionPageSize(size);

        if (nextSize === this.transactionPageSize()) {
            return;
        }

        this.transactionPageSize.set(nextSize);
        writeStoredTransactionPageSize(nextSize);

        this.reloadCurrentTransactionPage();
    }

    goToTransactionPage(page: number): void {
        if (!Number.isFinite(page)) {
            return;
        }

        const nextPage = Math.min(
            Math.max(1, Math.trunc(page)),
            this.transactionPagination().totalPages,
        );

        if (nextPage === this.transactionPagination().page) {
            return;
        }

        this.reloadCurrentTransactionPage(nextPage);
    }

    setApplicationCurrencyCode(currencyCode: string): void {
        const nextCode = toSupportedCurrencyCode(currencyCode);

        if (!nextCode || nextCode === this.applicationCurrencyCode() || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.updateApplicationCurrency({ applicationCurrencyCode: nextCode }),
            'Не удалось обновить валюту приложения.',
            (currentUser) => {
                const applicationCurrencyCode = this.resolvePayloadApplicationCurrencyCode(
                    currentUser,
                    this.accountResponses(),
                );

                this.refreshApplicationExchangeRates(applicationCurrencyCode);
            },
        );
    }

    goToPreviousMonth(): void {
        this.goToMonth(addMonths(this.selectedMonth(), -1));
    }

    goToNextMonth(): void {
        this.goToMonth(addMonths(this.selectedMonth(), 1));
    }

    startAddingTransaction(): void {
        this.activeTab.set('overview');
        this.editingTransactionId.set(null);
        this.transactionDraft.set(this.getDefaultTransactionDraft());
        this.isTransactionDialogOpen.set(true);
        this.ensureCategoriesLoaded();
    }

    startEditingTransaction(transaction: TransactionItem | string): void {
        const draft =
            typeof transaction === 'string'
                ? this.findTransactionDraft(transaction)
                : this.transactionItemToDraft(transaction);
        const transactionId = typeof transaction === 'string' ? transaction : transaction.id;

        if (!draft) {
            return;
        }

        this.activeTab.set('overview');
        this.editingTransactionId.set(transactionId);
        this.transactionDraft.set(draft);
        this.isTransactionDialogOpen.set(true);
        this.ensureCategoriesLoaded();
    }

    closeTransactionDialog(): void {
        this.isTransactionDialogOpen.set(false);
        this.editingTransactionId.set(null);
    }

    updateTransactionDraft(draft: TransactionDraft): void {
        const validCategories =
            draft.type === 'income' ? this.incomeCategoryOptions() : this.expenseCategoryOptions();
        const nextCategoryId =
            !this.hasLoadedCategories ||
            (validCategories.some((option) => option.value === draft.categoryId) &&
                draft.categoryId)
                ? draft.categoryId
                : (validCategories[0]?.value ?? '');

        this.transactionDraft.set({ ...draft, categoryId: nextCategoryId });
    }

    saveTransaction(): void {
        const draft = this.transactionDraft();
        const editingTransactionId = this.editingTransactionId();

        if (!this.hasLoadedCategories) {
            this.ensureCategoriesLoaded();
        }

        if (!this.canSaveTransactionDraft(draft) || this.isSaving()) {
            return;
        }

        const payload = {
            categoryId: draft.categoryId,
            amount: draft.type === 'income' ? Math.abs(draft.amount) : -Math.abs(draft.amount),
            date: toApiDate(draft.date),
            description: draft.description.trim(),
        };

        if (editingTransactionId) {
            const shouldReloadYearTransactions = this.shouldRefreshYearTransactionsForDraft(
                draft,
                editingTransactionId,
            );

            this.runMutation(
                this.homeApi.updateTransaction(editingTransactionId, payload),
                'Не удалось обновить транзакцию.',
                () => {
                    this.isTransactionDialogOpen.set(false);
                    this.editingTransactionId.set(null);
                    this.transactionDraft.set(this.getDefaultTransactionDraft());
                    this.refreshTransactionData(shouldReloadYearTransactions);
                },
            );
            return;
        }

        const shouldReloadYearTransactions = this.shouldRefreshYearTransactionsForDraft(draft);

        this.runMutation(
            this.homeApi.createTransaction({
                accountId: draft.accountId,
                ...payload,
            }),
            'Не удалось добавить транзакцию.',
            () => {
                this.isTransactionDialogOpen.set(false);
                this.editingTransactionId.set(null);
                this.transactionDraft.set(this.getDefaultTransactionDraft());
                this.refreshTransactionData(shouldReloadYearTransactions);
            },
        );
    }

    deleteTransaction(transactionId: string): void {
        const transaction =
            this.transactionResponses().find((item) => item.id === transactionId) ??
            this.yearTransactionResponses().find((item) => item.id === transactionId);

        if (!transaction || this.isTransferTransaction(transaction) || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.deleteTransaction(transactionId),
            'Не удалось удалить транзакцию.',
            () =>
                this.refreshTransactionData(
                    this.shouldRefreshYearTransactionsForTransaction(transaction),
                ),
        );
    }

    updateTransferDraft(draft: TransferDraft): void {
        const previous = this.transferDraft();
        const hasAccountPairChanged =
            previous.fromAccountId !== draft.fromAccountId ||
            previous.toAccountId !== draft.toAccountId;
        const nextDraft = hasAccountPairChanged ? { ...draft, rate: null } : draft;

        this.transferDraft.set(nextDraft);

        if (hasAccountPairChanged) {
            this.prefillTransferRate(nextDraft);
        }
    }

    transferBetweenAccounts(): void {
        const draft = this.transferDraft();
        const fromAccount = this.accounts().find((account) => account.id === draft.fromAccountId);
        const toAccount = this.accounts().find((account) => account.id === draft.toAccountId);

        if (
            !isPositiveFiniteAmount(draft.amount) ||
            !fromAccount ||
            !toAccount ||
            draft.fromAccountId === draft.toAccountId ||
            this.isSaving()
        ) {
            return;
        }

        const usesSameCurrency = fromAccount.currencyCode === toAccount.currencyCode;
        if (!usesSameCurrency && (!draft.rate || draft.rate <= 0)) {
            return;
        }

        const rate = usesSameCurrency ? null : draft.rate;
        const description = draft.description.trim() || 'Перевод между счетами';

        this.runMutation(
            this.homeApi.createTransfer({
                fromAccountId: draft.fromAccountId,
                toAccountId: draft.toAccountId,
                amount: draft.amount,
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
                this.refreshTransactionData(this.activeTab() === 'analytics');
            },
        );
    }

    setNewAccountName(value: string): void {
        this.newAccountName.set(value);
        this.accountNameError.set('');
    }

    setNewAccountCurrency(value: string): void {
        const nextCode = toSupportedCurrencyCode(value);

        if (!nextCode) {
            return;
        }

        this.newAccountCurrency.set(nextCode);
    }

    createPrimaryAccount(): void {
        if (this.isSaving()) {
            return;
        }

        const currencyCode = this.newAccountCurrency();

        this.runMutation(
            this.homeApi.createAccount({
                name: PRIMARY_ACCOUNT_NAME,
                currencyCode,
                color: ACCOUNT_COLORS[0],
            }),
            'Не получилось создать основной счёт. Проверьте валюту и попробуйте ещё раз.',
            () => {
                this.newAccountName.set('');
                this.accountNameError.set('');
                this.dashboardLoadRequestId++;
                this.refreshAccountData({
                    reloadYearTransactions: false,
                    defaultApplicationCurrencyCode: currencyCode,
                });
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
                this.refreshAccountData({ reloadYearTransactions: false });
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
        const account = this.accountResponses().find((item) => item.id === accountId);

        if (!account || account.isPrimary || this.isSaving()) {
            return;
        }

        this.runMutation(this.homeApi.deleteAccount(accountId), 'Не удалось удалить счёт.', () =>
            this.refreshAccountData(),
        );
    }

    setNewIncomeCategory(value: string): void {
        this.newIncomeCategory.set(value);
    }

    setNewExpenseCategory(value: string): void {
        this.newExpenseCategory.set(value);
    }

    setNewIncomeCategoryColor(value: string): void {
        const nextColor = resolveHexColor(value);

        if (!nextColor) {
            return;
        }

        this.newIncomeCategoryColor.set(nextColor);
    }

    setNewExpenseCategoryColor(value: string): void {
        const nextColor = resolveHexColor(value);

        if (!nextColor) {
            return;
        }

        this.newExpenseCategoryColor.set(nextColor);
    }

    setNewTagGroup(value: string): void {
        this.newTagGroup.set(value);
    }

    setNewTagGroupColor(value: string): void {
        const nextColor = resolveHexColor(value);

        if (!nextColor) {
            return;
        }

        this.newTagGroupColor.set(nextColor);
    }

    addIncomeCategory(): void {
        this.createCategory(this.newIncomeCategory(), 'Credit', this.newIncomeCategoryColor());
    }

    addExpenseCategory(): void {
        this.createCategory(this.newExpenseCategory(), 'Debit', this.newExpenseCategoryColor());
    }

    deleteCategory(categoryId: string): void {
        const category = this.categoryResponses().find((item) => item.id === categoryId);

        if (!category || category.isSystem || this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.deleteCategory(categoryId),
            'Не удалось удалить категорию.',
            () => {
                this.reloadCategories();
                this.refreshLoadedTagDetails();
            },
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
                color: this.newTagGroupColor(),
            }),
            'Не удалось создать тег.',
            () => {
                this.newTagGroup.set('');
                this.reloadTags();
            },
        );
    }

    deleteTag(tagId: string): void {
        const tag = this.tagDetailsResponses().find((item) => item.id === tagId && !item.isDeleted);

        if (!tag || this.isSaving()) {
            return;
        }

        this.runMutation(this.homeApi.deleteTag(tagId), 'Не удалось удалить тег.', () =>
            this.reloadTags(),
        );
    }

    assignCategoryToTag(tagId: string, categoryId: string): void {
        const tag = this.tagGroups().find((item) => item.id === tagId);

        if (
            !tag ||
            !this.isAssignableTagCategory(categoryId) ||
            tag.categories.some((category) => category.id === categoryId)
        ) {
            return;
        }

        const categoryIds = new Set(tag.categories.map((category) => category.id));
        categoryIds.add(categoryId);

        this.assignTagCategories(tagId, [...categoryIds]);
    }

    removeCategoryFromTag(tagId: string, categoryId: string): void {
        const tag = this.tagGroups().find((item) => item.id === tagId);

        if (!tag || !tag.categories.some((category) => category.id === categoryId)) {
            return;
        }

        const categoryIds = (tag?.categories ?? [])
            .map((category) => category.id)
            .filter((id) => id !== categoryId);

        this.assignTagCategories(tagId, categoryIds);
    }

    private loadDashboardPayload() {
        return forkJoin({
            accounts: this.loadAccounts(),
            currentUser: this.homeApi.getCurrentUser(),
        }).pipe(
            switchMap(({ accounts, currentUser }) => {
                const selectedMonth = this.selectedMonth();
                const applicationCurrencyCode = this.resolvePayloadApplicationCurrencyCode(
                    currentUser,
                    accounts,
                );

                if (!accounts.length) {
                    return of<DashboardPayload>({
                        accounts,
                        currentUser: {
                            ...currentUser,
                            applicationCurrencyCode,
                        },
                        transactionPage: createEmptyTransactionPage(this.transactionPageSize()),
                        yearTransactions: [],
                        yearBalances: [],
                        exchangeRatesByAccountId: new Map<string, number>(),
                    });
                }

                return forkJoin({
                    exchangeRatesByAccountId: this.loadApplicationExchangeRates(
                        accounts,
                        applicationCurrencyCode,
                    ),
                    transactions: this.loadTransactionPage(
                        this.transactionQuery(),
                        this.transactionPageSize(),
                    ),
                    yearTransactions: this.loadTransactions(this.yearTransactionQuery()),
                    yearBalances: this.loadMonthBalances(accounts, [selectedMonth]),
                }).pipe(
                    map(
                        ({
                            exchangeRatesByAccountId,
                            transactions,
                            yearTransactions,
                            yearBalances,
                        }): DashboardPayload => ({
                            accounts,
                            currentUser: {
                                ...currentUser,
                                applicationCurrencyCode,
                            },
                            transactionPage: transactions,
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

                return from(tags).pipe(
                    concatMap((tag) => this.toTagDetails(tag)),
                    reduce(
                        (details, tagDetails) => [...details, tagDetails],
                        [] as TagDetailsResponse[],
                    ),
                );
            }),
        );
    }

    private loadTransactions(query: { accountId?: string; fromDate: string; toDate: string }) {
        return this.loadAllPages<TransactionResponse>((page) =>
            this.homeApi.getTransactions({ ...query, page }),
        );
    }

    private loadTransactionPage(
        query: { accountId?: string; fromDate: string; toDate: string },
        size: number,
        page = 1,
    ): Observable<PagedResponse<TransactionResponse>> {
        return this.homeApi.getTransactions({ ...query, page, size });
    }

    private loadApplicationExchangeRates(
        accounts: AccountResponse[],
        applicationCurrencyCode: string,
    ) {
        const applicationAccount = this.resolveApplicationAccount(
            accounts,
            applicationCurrencyCode,
        );

        if (!applicationAccount) {
            return of(new Map<string, number>());
        }

        return from(accounts).pipe(
            concatMap((account) => {
                if (
                    account.id === applicationAccount.id ||
                    account.currencyCode === applicationAccount.currencyCode
                ) {
                    return of([account.id, 1] as const);
                }

                return this.homeApi
                    .getTransferRate(account.id, applicationAccount.id)
                    .pipe(map((response) => [account.id, response.rate] as const));
            }),
            reduce(
                (rates, [accountId, rate]) => rates.set(accountId, rate),
                new Map<string, number>(),
            ),
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

                return range(2, firstPage.totalPages - 1).pipe(
                    concatMap((page) => loadPage(page)),
                    reduce((items: T[], page) => [...items, ...page.items], [...firstPage.items]),
                );
            }),
        );
    }

    private toTagDetails(tag: TagResponse) {
        return this.homeApi.getTagById(tag.id);
    }

    private loadMonthBalances(accounts: AccountResponse[], months: Date[]) {
        const requests = accounts.flatMap((account) =>
            months.map((month) => ({
                accountId: account.id,
                year: month.getFullYear(),
                month: month.getMonth() + 1,
            })),
        );

        if (!requests.length) {
            return of<MonthBalanceResponse[]>([]);
        }

        return from(requests).pipe(
            concatMap((request) =>
                this.homeApi.getMonthBalance(request.accountId, request.year, request.month),
            ),
            reduce((balances, balance) => [...balances, balance], [] as MonthBalanceResponse[]),
        );
    }

    private setPayload(payload: DashboardPayload): void {
        this.accountResponses.set(payload.accounts);
        this.applicationCurrencyCodeSignal.set(payload.currentUser.applicationCurrencyCode);
        this.exchangeRatesByAccountId.set(payload.exchangeRatesByAccountId);
        this.setTransactionPage(payload.transactionPage);
        this.yearTransactionResponses.set(payload.yearTransactions);
        this.areYearTransactionsStale = false;
        this.yearBalanceResponses.set(payload.yearBalances);
        this.loadedFullBalanceYear = null;
        this.hasLoaded.set(true);
        this.ensureSelectedAccountExists();
        this.ensureDraftDefaults();
        this.loadYearBalancesForTab(this.activeTab());
    }

    private clearPayload(): void {
        this.accountResponses.set([]);
        this.categoryResponses.set([]);
        this.tagDetailsResponses.set([]);
        this.selectedAccountId.set('all');
        this.accountsSelectedAccountId.set('all');
        this.analyticsSelectedAccountId.set('all');
        this.hasLoadedCategories = false;
        this.isCategoryDataLoading = false;
        this.hasLoadedTagDetails.set(false);
        this.isYearTransactionsLoading = false;
        this.areYearTransactionsStale = false;
        this.setTransactionPage(createEmptyTransactionPage(this.transactionPageSize()));
        this.yearTransactionResponses.set([]);
        this.yearBalanceResponses.set([]);
        this.exchangeRatesByAccountId.set(new Map<string, number>());
        this.loadedFullBalanceYear = null;
    }

    private setTransactionPage(page: PagedResponse<TransactionResponse>): void {
        this.transactionResponses.set(page.items);
        this.transactionPagination.set(mapTransactionPagination(page));
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

                this.reloadCategories();
                this.refreshLoadedTagDetails();
            },
        );
    }

    private goToMonth(nextMonth: Date): void {
        const currentYear = this.selectedMonth().getFullYear();
        const nextYear = nextMonth.getFullYear();

        this.selectedMonth.set(nextMonth);

        if (!this.hasLoaded()) {
            this.loadDashboard();
            return;
        }

        if (currentYear === nextYear) {
            this.reloadCurrentTransactionPage();
            this.loadSelectedMonthBalances();
            return;
        }

        this.refreshPeriodData();
    }

    private reloadCurrentTransactionPage(page = 1): void {
        this.errorMessage.set('');
        const requestId = ++this.currentTransactionPageRequestId;

        if (!this.accountResponses().length) {
            this.setTransactionPage(createEmptyTransactionPage(this.transactionPageSize()));
            return;
        }

        this.loadTransactionPage(this.transactionQuery(), this.transactionPageSize(), page)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (transactionPage) => {
                    if (requestId !== this.currentTransactionPageRequestId) {
                        return;
                    }

                    this.setTransactionPage(transactionPage);
                },
                error: (error) => {
                    if (requestId !== this.currentTransactionPageRequestId) {
                        return;
                    }

                    this.errorMessage.set(
                        toFriendlyApiError(
                            error,
                            'Не удалось обновить список транзакций. Проверьте подключение и попробуйте ещё раз.',
                        ),
                    );
                },
            });
    }

    private reloadSelectedYearTransactions(): void {
        this.errorMessage.set('');
        const requestId = ++this.selectedYearTransactionsRequestId;

        if (!this.accountResponses().length) {
            this.yearTransactionResponses.set([]);
            this.areYearTransactionsStale = false;
            return;
        }

        this.isYearTransactionsLoading = true;

        this.loadTransactions(this.yearTransactionQuery())
            .pipe(
                finalize(() => {
                    if (requestId === this.selectedYearTransactionsRequestId) {
                        this.isYearTransactionsLoading = false;
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (transactions) => {
                    if (requestId !== this.selectedYearTransactionsRequestId) {
                        return;
                    }

                    this.yearTransactionResponses.set(transactions);
                    this.areYearTransactionsStale = false;
                },
                error: (error) => {
                    if (requestId !== this.selectedYearTransactionsRequestId) {
                        return;
                    }

                    this.errorMessage.set(toFriendlyApiError(error, FRIENDLY_LOAD_ERROR_MESSAGE));
                },
            });
    }

    private reloadCategories(): void {
        this.errorMessage.set('');
        const requestId = ++this.categoryReloadRequestId;
        this.isCategoryDataLoading = true;

        this.loadCategories()
            .pipe(
                finalize(() => {
                    if (requestId === this.categoryReloadRequestId) {
                        this.isCategoryDataLoading = false;
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (categories) => {
                    if (requestId !== this.categoryReloadRequestId) {
                        return;
                    }

                    this.categoryResponses.set(categories);
                    this.hasLoadedCategories = true;
                    this.ensureDraftDefaults();
                },
                error: (error) => {
                    if (requestId !== this.categoryReloadRequestId) {
                        return;
                    }

                    this.errorMessage.set(
                        toFriendlyApiError(
                            error,
                            'Не удалось обновить категории. Проверьте подключение и попробуйте ещё раз.',
                        ),
                    );
                },
            });
    }

    private loadCategoriesForTab(tab: HomeTabId): void {
        if (tab !== 'analytics' && tab !== 'categories') {
            return;
        }

        this.ensureCategoriesLoaded();
    }

    private ensureCategoriesLoaded(): void {
        if (this.hasLoadedCategories || this.isCategoryDataLoading || this.isDestroyed) {
            return;
        }

        this.reloadCategories();
    }

    private refreshSelectedMonthBalances(): void {
        const requestId = ++this.selectedMonthBalanceRequestId;

        this.loadMonthBalances(this.accountResponses(), [this.selectedMonth()])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (balances) => {
                    if (requestId !== this.selectedMonthBalanceRequestId) {
                        return;
                    }

                    this.mergeMonthBalances(balances);
                },
                error: (error) => {
                    if (requestId !== this.selectedMonthBalanceRequestId) {
                        return;
                    }

                    this.errorMessage.set(toFriendlyApiError(error, FRIENDLY_LOAD_ERROR_MESSAGE));
                },
            });
    }

    private refreshTransactionData(reloadYearTransactions: boolean): void {
        this.reloadCurrentTransactionPage();

        if (reloadYearTransactions || this.activeTab() === 'analytics') {
            this.reloadSelectedYearTransactions();
        } else {
            this.areYearTransactionsStale = true;
        }

        if (this.activeTab() === 'analytics') {
            this.reloadSelectedYearBalances();
            return;
        }

        this.keepOnlySelectedMonthBalancesForSelectedYear();
        this.refreshSelectedMonthBalances();
    }

    private refreshPeriodData(): void {
        if (!this.accountResponses().length) {
            this.setTransactionPage(createEmptyTransactionPage(this.transactionPageSize()));
            this.yearTransactionResponses.set([]);
            this.yearBalanceResponses.set([]);
            this.loadedFullBalanceYear = null;
            return;
        }

        this.reloadCurrentTransactionPage();
        this.reloadSelectedYearTransactions();
        this.yearBalanceResponses.set([]);
        this.loadedFullBalanceYear = null;

        if (this.activeTab() === 'analytics') {
            this.loadYearBalancesForSelectedYear();
            return;
        }

        this.loadSelectedMonthBalances();
    }

    private loadYearTransactionsForTab(tab: HomeTabId): void {
        if (
            tab !== 'analytics' ||
            !this.areYearTransactionsStale ||
            this.isYearTransactionsLoading
        ) {
            return;
        }

        this.reloadSelectedYearTransactions();
    }

    private refreshApplicationExchangeRates(applicationCurrencyCode: string): void {
        this.errorMessage.set('');
        const requestId = ++this.applicationExchangeRatesRequestId;

        this.loadApplicationExchangeRates(this.accountResponses(), applicationCurrencyCode)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (exchangeRatesByAccountId) => {
                    if (requestId !== this.applicationExchangeRatesRequestId) {
                        return;
                    }

                    this.applicationCurrencyCodeSignal.set(applicationCurrencyCode);
                    this.exchangeRatesByAccountId.set(exchangeRatesByAccountId);
                },
                error: (error) => {
                    if (requestId !== this.applicationExchangeRatesRequestId) {
                        return;
                    }

                    this.errorMessage.set(toFriendlyApiError(error, FRIENDLY_LOAD_ERROR_MESSAGE));
                },
            });
    }

    private refreshAccountData(
        options: {
            reloadYearTransactions?: boolean;
            defaultApplicationCurrencyCode?: string;
        } = {},
    ): void {
        this.errorMessage.set('');
        const requestId = ++this.accountDataRequestId;
        const reloadYearTransactions = options.reloadYearTransactions ?? true;
        const defaultApplicationCurrencyCode = options.defaultApplicationCurrencyCode
            ? toSupportedCurrencyCode(options.defaultApplicationCurrencyCode)
            : null;

        this.loadAccounts()
            .pipe(
                switchMap((accounts) => {
                    const selectedAccountId = this.selectedAccountIdForAccounts(accounts);
                    const accountsSelectedAccountId = this.accountFilterIdForAccounts(
                        this.accountsSelectedAccountId(),
                        accounts,
                    );
                    const analyticsSelectedAccountId = this.accountFilterIdForAccounts(
                        this.analyticsSelectedAccountId(),
                        accounts,
                    );
                    const applicationCurrencyCode =
                        defaultApplicationCurrencyCode ??
                        this.resolveApplicationCurrencyCode(
                            this.applicationCurrencyCode(),
                            accounts,
                        );

                    if (!accounts.length) {
                        return of({
                            accounts,
                            selectedAccountId,
                            accountsSelectedAccountId,
                            analyticsSelectedAccountId,
                            applicationCurrencyCode,
                            exchangeRatesByAccountId: new Map<string, number>(),
                            transactionPage: createEmptyTransactionPage(this.transactionPageSize()),
                            yearTransactions: [],
                            yearBalances: [],
                        });
                    }

                    const balanceMonths =
                        this.activeTab() === 'analytics'
                            ? this.monthsForSelectedYear()
                            : [this.selectedMonth()];

                    return forkJoin({
                        exchangeRatesByAccountId: this.loadApplicationExchangeRates(
                            accounts,
                            applicationCurrencyCode,
                        ),
                        transactions: this.loadTransactionPage(
                            this.transactionQuery(selectedAccountId),
                            this.transactionPageSize(),
                        ),
                        yearTransactions: reloadYearTransactions
                            ? this.loadTransactions(this.yearTransactionQuery())
                            : of(this.yearTransactionResponses()),
                        yearBalances: this.loadMonthBalances(accounts, balanceMonths),
                    }).pipe(
                        map(
                            ({
                                exchangeRatesByAccountId,
                                transactions,
                                yearTransactions,
                                yearBalances,
                            }) => ({
                                accounts,
                                selectedAccountId,
                                accountsSelectedAccountId,
                                analyticsSelectedAccountId,
                                applicationCurrencyCode,
                                exchangeRatesByAccountId,
                                transactionPage: transactions,
                                yearTransactions,
                                yearBalances,
                            }),
                        ),
                    );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: ({
                    accounts,
                    selectedAccountId,
                    accountsSelectedAccountId,
                    analyticsSelectedAccountId,
                    applicationCurrencyCode,
                    exchangeRatesByAccountId,
                    transactionPage,
                    yearTransactions,
                    yearBalances,
                }) => {
                    if (requestId !== this.accountDataRequestId) {
                        return;
                    }

                    this.accountResponses.set(accounts);
                    this.selectedAccountId.set(selectedAccountId);
                    this.accountsSelectedAccountId.set(accountsSelectedAccountId);
                    this.analyticsSelectedAccountId.set(analyticsSelectedAccountId);
                    this.applicationCurrencyCodeSignal.set(applicationCurrencyCode);
                    this.exchangeRatesByAccountId.set(exchangeRatesByAccountId);
                    this.setTransactionPage(transactionPage);
                    this.yearTransactionResponses.set(yearTransactions);
                    this.areYearTransactionsStale = accounts.length > 0 && !reloadYearTransactions;
                    this.yearBalanceResponses.set(yearBalances);
                    this.hasLoaded.set(true);
                    this.loadedFullBalanceYear =
                        accounts.length > 0 && this.activeTab() === 'analytics'
                            ? this.selectedMonth().getFullYear()
                            : null;
                    this.ensureDraftDefaults();
                },
                error: (error) => {
                    if (requestId !== this.accountDataRequestId) {
                        return;
                    }

                    this.errorMessage.set(toFriendlyApiError(error, FRIENDLY_LOAD_ERROR_MESSAGE));
                },
            });
    }

    private loadSelectedMonthBalances(): void {
        const requestId = ++this.selectedMonthBalanceRequestId;
        const missingMonths = this.monthsMissingBalances([this.selectedMonth()]);

        if (!missingMonths.length) {
            return;
        }

        this.loadMonthBalances(this.accountResponses(), missingMonths)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (balances) => {
                    if (requestId !== this.selectedMonthBalanceRequestId) {
                        return;
                    }

                    this.mergeMonthBalances(balances);
                },
                error: (error) => {
                    if (requestId !== this.selectedMonthBalanceRequestId) {
                        return;
                    }

                    this.errorMessage.set(
                        toFriendlyApiError(
                            error,
                            'Не удалось обновить балансы счетов. Проверьте подключение и попробуйте ещё раз.',
                        ),
                    );
                },
            });
    }

    private loadYearBalancesForTab(tab: HomeTabId): void {
        if (tab !== 'analytics') {
            return;
        }

        this.loadYearBalancesForSelectedYear();
    }

    private prefillTransferRateForTab(tab: HomeTabId): void {
        if (tab !== 'accounts') {
            return;
        }

        const draft = this.transferDraft();

        if (!this.shouldPrefillTransferRate(draft)) {
            return;
        }

        this.prefillTransferRate(draft);
    }

    private loadYearBalancesForSelectedYear(): void {
        const selectedYear = this.selectedMonth().getFullYear();

        if (
            this.loadedFullBalanceYear === selectedYear ||
            this.loadingYearBalanceYear === selectedYear
        ) {
            return;
        }

        const missingMonths = this.monthsMissingBalances(this.monthsForSelectedYear());

        if (!missingMonths.length) {
            this.loadedFullBalanceYear = selectedYear;
            return;
        }

        const requestId = ++this.yearBalanceRequestId;
        this.loadingYearBalanceYear = selectedYear;

        this.loadMonthBalances(this.accountResponses(), missingMonths)
            .pipe(
                finalize(() => {
                    if (requestId === this.yearBalanceRequestId) {
                        this.loadingYearBalanceYear = null;
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (balances) => {
                    if (requestId !== this.yearBalanceRequestId) {
                        return;
                    }

                    this.mergeMonthBalances(balances);
                    this.loadedFullBalanceYear = selectedYear;
                },
                error: (error) => {
                    if (requestId !== this.yearBalanceRequestId) {
                        return;
                    }

                    this.errorMessage.set(
                        toFriendlyApiError(
                            error,
                            'Не удалось загрузить годовую динамику балансов. Проверьте подключение и попробуйте ещё раз.',
                        ),
                    );
                },
            });
    }

    private reloadSelectedYearBalances(): void {
        const selectedYear = this.selectedMonth().getFullYear();

        if (this.loadingYearBalanceYear === selectedYear) {
            return;
        }

        const requestId = ++this.yearBalanceRequestId;
        this.loadingYearBalanceYear = selectedYear;

        this.loadMonthBalances(this.accountResponses(), this.monthsForSelectedYear())
            .pipe(
                finalize(() => {
                    if (requestId === this.yearBalanceRequestId) {
                        this.loadingYearBalanceYear = null;
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (balances) => {
                    if (requestId !== this.yearBalanceRequestId) {
                        return;
                    }

                    this.mergeMonthBalances(balances);
                    this.loadedFullBalanceYear = selectedYear;
                },
                error: (error) => {
                    if (requestId !== this.yearBalanceRequestId) {
                        return;
                    }

                    this.errorMessage.set(toFriendlyApiError(error, FRIENDLY_LOAD_ERROR_MESSAGE));
                },
            });
    }

    private monthsMissingBalances(months: ReadonlyArray<Date>): Date[] {
        return findMissingBalanceMonths(
            this.accountResponses(),
            this.yearBalanceResponses(),
            months,
        );
    }

    private mergeMonthBalances(balances: ReadonlyArray<MonthBalanceResponse>): void {
        if (!balances.length) {
            return;
        }

        this.yearBalanceResponses.set(
            mergeMonthBalanceCache(this.yearBalanceResponses(), balances),
        );
    }

    private keepOnlySelectedMonthBalancesForSelectedYear(): void {
        this.yearBalanceResponses.set(
            keepSelectedMonthBalanceForYear(this.yearBalanceResponses(), this.selectedMonth()),
        );
        this.loadedFullBalanceYear = null;
    }

    private assignTagCategories(tagId: string, categoryIds: string[]): void {
        if (this.isSaving()) {
            return;
        }

        this.runMutation(
            this.homeApi.assignTagCategories(tagId, { categoryIds }),
            'Не удалось обновить категории тега.',
            () => this.reloadTags(),
        );
    }

    private loadTagDetailsForTab(tab: HomeTabId): void {
        if (tab !== 'analytics' && tab !== 'categories') {
            return;
        }

        if (this.hasLoadedTagDetails() || this.isTagDetailsLoading) {
            return;
        }

        this.reloadTags();
    }

    private refreshLoadedTagDetails(): void {
        if (!this.hasLoadedTagDetails() && !this.isTagDetailsLoading) {
            return;
        }

        this.reloadTags();
    }

    private reloadTags(): void {
        if (this.isDestroyed) {
            return;
        }

        if (this.isTagDetailsLoading) {
            this.shouldRefreshTagDetailsAfterLoad = true;
            return;
        }

        this.isTagDetailsLoading = true;

        this.loadTagDetails()
            .pipe(
                finalize(() => {
                    this.isTagDetailsLoading = false;
                    if (!this.isDestroyed && this.shouldRefreshTagDetailsAfterLoad) {
                        this.shouldRefreshTagDetailsAfterLoad = false;
                        this.reloadTags();
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (tags) => {
                    if (this.shouldRefreshTagDetailsAfterLoad) {
                        return;
                    }

                    this.tagDetailsResponses.set(tags);
                    this.hasLoadedTagDetails.set(true);
                },
                error: (error) => {
                    if (this.shouldRefreshTagDetailsAfterLoad) {
                        return;
                    }

                    this.errorMessage.set(
                        toFriendlyApiError(
                            error,
                            'Не удалось обновить теги. Проверьте подключение и попробуйте ещё раз.',
                        ),
                    );
                },
            });
    }

    private runMutation<T>(
        request$: Observable<T>,
        errorMessage: string,
        onSuccess: (response: T) => void,
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
        const requestId = ++this.transferRateRequestId;
        const fromAccount = this.accounts().find((account) => account.id === draft.fromAccountId);
        const toAccount = this.accounts().find((account) => account.id === draft.toAccountId);

        this.transferRateError.set('');

        if (!fromAccount || !toAccount || draft.fromAccountId === draft.toAccountId) {
            this.isTransferRateLoading.set(false);
            return;
        }

        if (fromAccount.currencyCode === toAccount.currencyCode) {
            this.transferDraft.update((value) => ({
                ...value,
                rate: null,
            }));
            this.isTransferRateLoading.set(false);
            return;
        }

        this.isTransferRateLoading.set(true);

        this.homeApi
            .getTransferRate(draft.fromAccountId, draft.toAccountId)
            .pipe(
                finalize(() => {
                    if (requestId === this.transferRateRequestId) {
                        this.isTransferRateLoading.set(false);
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (response) => {
                    const current = this.transferDraft();

                    if (
                        requestId !== this.transferRateRequestId ||
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
                    if (requestId !== this.transferRateRequestId) {
                        return;
                    }

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

    private convertAnalyticsTransactionAmount(transaction: TransactionResponse): number {
        return this.convertAnalyticsAccountAmount(transaction.account.id, transaction.amount);
    }

    private convertAccountAmount(accountId: string, amount: number): number {
        const rate = this.exchangeRatesByAccountId().get(accountId) ?? 1;

        return amount * rate;
    }

    private convertAnalyticsAccountAmount(accountId: string, amount: number): number {
        if (this.analyticsSelectedAccountId() !== 'all') {
            return amount;
        }

        return this.convertAccountAmount(accountId, amount);
    }

    private resolveApplicationAccount(
        accounts: AccountResponse[],
        applicationCurrencyCode: string,
    ): AccountResponse | undefined {
        const sortedAccounts = this.sortAccounts(accounts);

        return (
            sortedAccounts.find((account) => account.currencyCode === applicationCurrencyCode) ??
            sortedAccounts[0]
        );
    }

    private resolvePayloadApplicationCurrencyCode(
        currentUser: CurrentUserResponse,
        accounts: AccountResponse[],
    ): string {
        return this.resolveApplicationCurrencyCode(currentUser.applicationCurrencyCode, accounts);
    }

    private resolveApplicationCurrencyCode(
        currencyCode: string | null | undefined,
        accounts: AccountResponse[],
    ): string {
        const sortedAccounts = this.sortAccounts(accounts);
        const savedCurrencyCode = currencyCode ? toSupportedCurrencyCode(currencyCode) : null;

        return savedCurrencyCode || sortedAccounts[0]?.currencyCode || 'BYN';
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
        if (!this.canUseAccountFilter(this.selectedAccountId())) {
            this.selectedAccountId.set('all');
        }

        if (!this.canUseAccountFilter(this.accountsSelectedAccountId())) {
            this.accountsSelectedAccountId.set('all');
        }

        if (!this.canUseAccountFilter(this.analyticsSelectedAccountId())) {
            this.analyticsSelectedAccountId.set('all');
        }
    }

    private selectedAccountIdForAccounts(accounts: ReadonlyArray<AccountResponse>): string {
        const selectedAccountId = this.selectedAccountId();

        if (
            selectedAccountId !== 'all' &&
            !accounts.some((account) => account.id === selectedAccountId)
        ) {
            return 'all';
        }

        return selectedAccountId;
    }

    private accountFilterIdForAccounts(
        accountId: string,
        accounts: ReadonlyArray<AccountResponse>,
    ): string {
        if (accountId !== 'all' && !accounts.some((account) => account.id === accountId)) {
            return 'all';
        }

        return accountId;
    }

    private canUseAccountFilter(accountId: string): boolean {
        return (
            accountId === 'all' ||
            this.accountResponses().some((account) => account.id === accountId)
        );
    }

    private isAssignableTagCategory(categoryId: string): boolean {
        return this.allCategoryOptions().some((category) => category.value === categoryId);
    }

    private shouldRefreshYearTransactionsForDraft(
        draft: TransactionDraft,
        editingTransactionId?: string | null,
    ): boolean {
        if (this.activeTab() === 'analytics') {
            return true;
        }

        const category = this.categoryResponses().find((item) => item.id === draft.categoryId);

        if (category && this.isDebtCategoryName(category.name)) {
            return true;
        }

        const editedTransaction = editingTransactionId
            ? this.findLoadedTransaction(editingTransactionId)
            : null;

        return editedTransaction
            ? this.shouldRefreshYearTransactionsForTransaction(editedTransaction)
            : false;
    }

    private shouldRefreshYearTransactionsForTransaction(transaction: TransactionResponse): boolean {
        return (
            this.activeTab() === 'analytics' || this.isDebtCategoryName(transaction.category.name)
        );
    }

    private findLoadedTransaction(transactionId: string): TransactionResponse | null {
        return (
            this.transactionResponses().find((item) => item.id === transactionId) ??
            this.yearTransactionResponses().find((item) => item.id === transactionId) ??
            null
        );
    }

    private isDebtCategoryName(categoryName: string): boolean {
        return resolveDebtCategoryKind(categoryName) !== null;
    }

    private canSaveTransactionDraft(draft: TransactionDraft): boolean {
        if (!draft.accountId || !draft.categoryId || !isPositiveFiniteAmount(draft.amount)) {
            return false;
        }

        if (!this.accountResponses().some((account) => account.id === draft.accountId)) {
            return false;
        }

        const categoryOptions =
            draft.type === 'income' ? this.incomeCategoryOptions() : this.expenseCategoryOptions();

        return categoryOptions.some((category) => category.value === draft.categoryId);
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
        const nextFromAccountId = accountOptions.some(
            (option) => option.value === transferDraft.fromAccountId,
        )
            ? transferDraft.fromAccountId
            : (accountOptions[0]?.value ?? '');
        const nextToAccountId = accountOptions.some(
            (option) => option.value === transferDraft.toAccountId,
        )
            ? transferDraft.toAccountId
            : (accountOptions[1]?.value ?? accountOptions[0]?.value ?? '');
        const hasTransferPairChanged =
            transferDraft.fromAccountId !== nextFromAccountId ||
            transferDraft.toAccountId !== nextToAccountId;
        const nextTransferDraft = {
            fromAccountId: nextFromAccountId,
            toAccountId: nextToAccountId,
            amount: transferDraft.amount,
            rate: hasTransferPairChanged ? null : transferDraft.rate,
            description: transferDraft.description,
        };

        this.transferDraft.set(nextTransferDraft);

        if (this.activeTab() === 'accounts' && this.shouldPrefillTransferRate(nextTransferDraft)) {
            this.prefillTransferRate(nextTransferDraft);
        }
    }

    private shouldPrefillTransferRate(draft: TransferDraft): boolean {
        return Boolean(draft.fromAccountId && draft.toAccountId && !draft.rate);
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

        return this.selectedYearTransactions().filter(
            (transaction) => monthKey(new Date(transaction.date)) === key,
        );
    }

    private buildCategoryMonthRows(
        months: Date[],
        type: 'income' | 'expense',
    ): AnalyticsCategoryMonthRow[] {
        const monthKeys = months.map((month) => monthKey(month));
        const categories = this.categoryResponses().filter((category) => {
            const isExpense = isExpenseCategory(category.type);

            return type === 'expense' ? isExpense : !isExpense;
        });

        return categories
            .map((category) => {
                const cells = monthKeys.map((key, index) => {
                    const value = this.selectedYearTransactions()
                        .filter((transaction) => transaction.category.id === category.id)
                        .filter((transaction) => monthKey(new Date(transaction.date)) === key)
                        .reduce(
                            (sum, transaction) =>
                                sum + Math.abs(this.convertAnalyticsTransactionAmount(transaction)),
                            0,
                        );

                    return {
                        label: compactMonthLabel(months[index]),
                        value,
                        formattedValue: value
                            ? formatMoney(value, this.analyticsCurrencyCode())
                            : '—',
                    };
                });
                const totalValue = cells.reduce((sum, cell) => sum + cell.value, 0);
                const averageValue = this.averageActiveValue(cells.map((cell) => cell.value));

                return {
                    id: category.id,
                    name: category.name,
                    color: safeHexColor(category.color, CATEGORY_COLORS[0]),
                    type,
                    cells,
                    totalValue,
                    formattedTotal: formatMoney(totalValue, this.analyticsCurrencyCode()),
                    averageValue,
                    formattedAverage: averageValue
                        ? formatMoney(averageValue, this.analyticsCurrencyCode())
                        : '—',
                };
            })
            .filter((row) => row.totalValue > 0)
            .sort((left, right) => right.totalValue - left.totalValue);
    }

    private buildDebtMonthRows(months: Date[]): AnalyticsCategoryMonthRow[] {
        const debtRows = [
            {
                id: 'owed-by-me',
                name: 'Я должен',
                color: CATEGORY_COLORS[2] ?? CATEGORY_COLORS[0],
                readValue: (totals: Map<DebtCategoryKind, number>) =>
                    Math.max(0, (totals.get('taken') ?? 0) - (totals.get('returned') ?? 0)),
            },
            {
                id: 'owed-to-me',
                name: 'Мне должны',
                color: CATEGORY_COLORS[0],
                readValue: (totals: Map<DebtCategoryKind, number>) =>
                    Math.max(0, (totals.get('given') ?? 0) - (totals.get('received') ?? 0)),
            },
        ];

        return debtRows
            .map((row) => {
                const cells = months.map((month) => {
                    const totals = calculateDebtTotalsUntilMonth(
                        this.selectedYearTransactions(),
                        month,
                        (transaction) => this.convertAnalyticsTransactionAmount(transaction),
                    );
                    const value = row.readValue(totals);

                    return {
                        label: compactMonthLabel(month),
                        value,
                        formattedValue: value
                            ? formatMoney(value, this.analyticsCurrencyCode())
                            : '—',
                    };
                });
                const totalValue = cells.at(-1)?.value ?? 0;
                const averageValue = this.averageActiveValue(cells.map((cell) => cell.value));

                return {
                    id: row.id,
                    name: row.name,
                    color: row.color,
                    type: 'debt' as const,
                    cells,
                    totalValue,
                    formattedTotal: totalValue
                        ? formatMoney(totalValue, this.analyticsCurrencyCode())
                        : '—',
                    averageValue,
                    formattedAverage: averageValue
                        ? formatMoney(averageValue, this.analyticsCurrencyCode())
                        : '—',
                };
            })
            .filter((row) => row.totalValue > 0 || row.cells.some((cell) => cell.value > 0));
    }

    private buildMonthSummary(
        months: Date[],
        rows: ReadonlyArray<AnalyticsCategoryMonthRow>,
        options: { totalFromLastCell?: boolean } = {},
    ): AnalyticsCategoryMonthSummary {
        const cells = months.map((month, index) => {
            const value = rows.reduce((sum, row) => sum + (row.cells[index]?.value ?? 0), 0);

            return {
                label: compactMonthLabel(month),
                value,
                formattedValue: value ? formatMoney(value, this.analyticsCurrencyCode()) : '—',
            };
        });
        const totalValue = options.totalFromLastCell
            ? (cells.at(-1)?.value ?? 0)
            : cells.reduce((sum, cell) => sum + cell.value, 0);
        const averageValue = this.averageActiveValue(cells.map((cell) => cell.value));

        return {
            cells,
            totalValue,
            formattedTotal: totalValue
                ? formatMoney(totalValue, this.analyticsCurrencyCode())
                : '—',
            averageValue,
            formattedAverage: averageValue
                ? formatMoney(averageValue, this.analyticsCurrencyCode())
                : '—',
        };
    }

    private averageActiveValue(values: ReadonlyArray<number>): number {
        const activeValues = values.filter((value) => value > 0);

        if (!activeValues.length) {
            return 0;
        }

        const total = activeValues.reduce((sum, value) => sum + value, 0);

        return Math.round((total / activeValues.length) * 100) / 100;
    }

    private transactionQuery(selectedAccountId = this.selectedAccountId()): {
        accountId?: string;
        fromDate: string;
        toDate: string;
    } {
        const monthStart = this.selectedMonth();
        const nextMonthStart = addMonths(monthStart, 1);

        return {
            accountId: selectedAccountId === 'all' ? undefined : selectedAccountId,
            fromDate: toIsoDate(monthStart),
            toDate: toIsoDate(nextMonthStart),
        };
    }

    private yearTransactionQuery(): {
        fromDate: string;
        toDate: string;
    } {
        const yearStart = startOfYear(this.selectedMonth());
        const nextYearStart = addMonths(yearStart, 12);

        return {
            fromDate: toIsoDate(yearStart),
            toDate: toIsoDate(nextYearStart),
        };
    }

    private monthsForSelectedYear(): Date[] {
        return getYearMonths(this.selectedMonth());
    }

    private findTransactionDraft(transactionId: string): TransactionDraft | null {
        const transaction = this.transactionResponses().find((item) => item.id === transactionId);

        if (!transaction || this.isTransferTransaction(transaction)) {
            return null;
        }

        return this.transactionToDraft(transaction);
    }

    private transactionToDraft(transaction: TransactionResponse): TransactionDraft {
        return {
            type: isExpenseCategory(transaction.category.type) ? 'expense' : 'income',
            accountId: transaction.account.id,
            categoryId: transaction.category.id,
            amount: Math.abs(transaction.amount),
            date: this.toDraftDate(transaction.date),
            description: transaction.description ?? '',
        };
    }

    private transactionItemToDraft(transaction: TransactionItem): TransactionDraft {
        return {
            type: transaction.tone,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
            amount: transaction.amountValue,
            date: this.toDraftDate(transaction.dateValue),
            description: transaction.description,
        };
    }

    private isTransferTransaction(transaction: TransactionResponse): boolean {
        return (
            transaction.category.type === 'TransferIncome' ||
            transaction.category.type === 'TransferExpense'
        );
    }

    private toDraftDate(value: string): string {
        const trimmed = value.trim();

        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
            return trimmed.slice(0, 16);
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return `${trimmed}T00:00`;
        }

        const date = new Date(trimmed);

        return Number.isFinite(date.getTime())
            ? toIsoDateTimeLocal(date)
            : this.defaultDateForSelectedMonth();
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
            date: toIsoDateTimeLocal(new Date()),
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
            return toIsoDateTimeLocal(today);
        }

        const selectedMonthWithCurrentTime = new Date(selectedMonth);
        selectedMonthWithCurrentTime.setHours(today.getHours(), today.getMinutes(), 0, 0);

        return toIsoDateTimeLocal(selectedMonthWithCurrentTime);
    }
}
