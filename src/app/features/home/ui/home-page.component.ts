import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { AddTransactionDialogComponent } from './components/add-transaction-dialog/add-transaction-dialog.component';
import { MainHeaderComponent } from './components/main-header/main-header.component';
import { MainSummaryCardsComponent } from './components/main-summary-cards/main-summary-cards.component';
import { MainToolbarComponent } from './components/main-toolbar/main-toolbar.component';
import { MainEmptyStateComponent } from './components/main-empty-state/main-empty-state.component';
import { MainTabBarComponent } from './components/main-tab-bar/main-tab-bar.component';
import { AccountsTabComponent } from './tab-panels/accounts-tab/accounts-tab.component';
import { AnalyticsTabComponent } from './tab-panels/analytics-tab/analytics-tab.component';
import { CategoriesTabComponent } from './tab-panels/categories-tab/categories-tab.component';
import { OverviewTabComponent } from './tab-panels/overview-tab/overview-tab.component';
import {
    AccountBalanceItem,
    AnalyticsMetricCard,
    AnalyticsSeriesPoint,
    AnalyticsStackedPoint,
    CategoryBreakdownItem,
    HomeSummaryCard,
    HomeTabId,
    HomeTabItem,
    TagGroupItem,
    TransactionDraft,
    TransactionItem,
    TransferDraft,
} from './home-page.models';
import { MsSelectOption } from '../../../shared/ui/select/select';

@Component({
    selector: 'app-home-page',
    standalone: true,
    imports: [
        MainHeaderComponent,
        MainSummaryCardsComponent,
        MainToolbarComponent,
        MainEmptyStateComponent,
        MainTabBarComponent,
        OverviewTabComponent,
        AccountsTabComponent,
        AnalyticsTabComponent,
        CategoriesTabComponent,
        AddTransactionDialogComponent,
    ],
    templateUrl: './home-page.component.html',
    styleUrl: './home-page.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
    readonly authStore = inject(AuthStore);
    private readonly authService = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);

    readonly searchControl = new FormControl('', { nonNullable: true });
    readonly activeTab = signal<HomeTabId>('overview');
    readonly monthIndex = signal(0);
    readonly selectedAccountId = signal('all');
    readonly searchQuery = signal('');
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
    readonly transactionDraft = signal<TransactionDraft>({
        type: 'income',
        accountId: '',
        category: '',
        amount: 0,
        date: '02.06.2026',
        description: '',
    });

    readonly months = ['Июнь 2026', 'Июль 2026', 'Август 2026'];
    readonly currencyOptions: ReadonlyArray<MsSelectOption> = [{ value: 'BYN', label: 'BYN' }];

    readonly tabs: ReadonlyArray<HomeTabItem> = [
        { id: 'overview', label: 'Главная', icon: 'grid_view' },
        { id: 'accounts', label: 'Счета', icon: 'account_balance' },
        { id: 'analytics', label: 'Аналитика', icon: 'monitoring' },
        { id: 'categories', label: 'Категории', icon: 'category' },
    ];

    readonly accounts = signal<AccountBalanceItem[]>([]);
    readonly transactions = signal<TransactionItem[]>([]);
    readonly incomeCategories = signal<CategoryBreakdownItem[]>([]);
    readonly expenseCategories = signal<CategoryBreakdownItem[]>([]);
    readonly tagGroups = signal<TagGroupItem[]>([]);
    readonly incomeVsExpense: ReadonlyArray<AnalyticsStackedPoint> = [];
    readonly monthlyExpensesChart: ReadonlyArray<AnalyticsSeriesPoint> = [];
    readonly balanceDynamicsChart: ReadonlyArray<AnalyticsSeriesPoint> = [];
    readonly tagExpensesChart: ReadonlyArray<CategoryBreakdownItem> = [];
    readonly topExpensesChart: ReadonlyArray<CategoryBreakdownItem> = [];
    readonly yearStatsChart: ReadonlyArray<AnalyticsMetricCard> = [];

    readonly monthLabel = computed(() => this.months[this.monthIndex()]);
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
        this.incomeCategories().map((category) => ({ value: category.name, label: category.name })),
    );
    readonly expenseCategoryOptions = computed<MsSelectOption[]>(() =>
        this.expenseCategories().map((category) => ({
            value: category.name,
            label: category.name,
        })),
    );
    readonly visibleAccounts = computed(() =>
        this.accounts().filter(
            (item) => this.selectedAccountId() === 'all' || item.id === this.selectedAccountId(),
        ),
    );
    readonly filteredTransactions = computed(() =>
        this.filterByQuery(
            this.transactions().filter(
                (item) =>
                    this.selectedAccountId() === 'all' ||
                    item.accountId === this.selectedAccountId(),
            ),
            (item) => `${item.title} ${item.category} ${item.description} ${item.accountName}`,
        ),
    );
    readonly analyticsMetrics = computed<ReadonlyArray<AnalyticsMetricCard>>(() => {
        const transactionCount = this.transactions().length;
        const accountCount = this.accounts().length;
        const categoryCount = this.incomeCategories().length + this.expenseCategories().length;

        return [
            {
                id: 'metric-transactions',
                label: 'Транзакции',
                value: `${transactionCount}`,
                caption: 'После API здесь появится реальная статистика операций',
            },
            {
                id: 'metric-accounts',
                label: 'Счета',
                value: `${accountCount}`,
                caption: 'Количество подключенных счетов',
            },
            {
                id: 'metric-categories',
                label: 'Категории',
                value: `${categoryCount}`,
                caption: 'Доходные и расходные категории',
            },
            {
                id: 'metric-status',
                label: 'Источник',
                value: 'API pending',
                caption: 'Экран уже готов к данным с бэкенда',
            },
        ];
    });
    readonly summaryCards = computed<ReadonlyArray<HomeSummaryCard>>(() => {
        const totalBalance = this.accounts().reduce(
            (sum, account) => sum + account.balanceValue,
            0,
        );
        const income = this.transactions()
            .filter((item) => item.tone === 'income')
            .reduce((sum, item) => sum + item.amountValue, 0);
        const expense = this.transactions()
            .filter((item) => item.tone === 'expense')
            .reduce((sum, item) => sum + item.amountValue, 0);

        return [
            {
                id: 'balance',
                label: 'Баланс',
                value: this.formatMoney(totalBalance, 'BYN'),
                helper: `${this.accounts().length} активных счетов`,
                tone: 'primary',
                icon: 'account_balance_wallet',
            },
            {
                id: 'income',
                label: 'Доходы',
                value: `+${this.formatMoney(income, 'BYN')}`,
                helper: 'Появятся после загрузки данных',
                tone: 'positive',
                icon: 'south_west',
            },
            {
                id: 'expense',
                label: 'Расходы',
                value: `-${this.formatMoney(expense, 'BYN')}`,
                helper: 'Появятся после загрузки данных',
                tone: 'negative',
                icon: 'north_east',
            },
            {
                id: 'budget',
                label: 'Бюджет',
                value: '0 Br',
                helper: `${this.expenseCategories().length} категорий расходов`,
                tone: 'neutral',
                icon: 'savings',
            },
        ];
    });
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

    constructor() {
        this.searchControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => this.searchQuery.set(value ?? ''));
    }

    setActiveTab(tab: HomeTabId): void {
        this.activeTab.set(tab);
    }

    setAccountFilter(accountId: string): void {
        this.selectedAccountId.set(accountId);
    }

    goToPreviousMonth(): void {
        this.monthIndex.update((value) => (value - 1 + this.months.length) % this.months.length);
    }

    goToNextMonth(): void {
        this.monthIndex.update((value) => (value + 1) % this.months.length);
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
        const nextCategory =
            validCategories.some((option) => option.value === draft.category) && draft.category
                ? draft.category
                : (validCategories[0]?.value ?? '');

        this.transactionDraft.set({ ...draft, category: nextCategory });
    }

    saveTransaction(): void {
        const draft = this.transactionDraft();
        const account = this.accounts().find((item) => item.id === draft.accountId);

        if (!account || !draft.amount) {
            return;
        }

        const nextAmount =
            draft.type === 'income'
                ? account.balanceValue + draft.amount
                : account.balanceValue - draft.amount;
        this.accounts.update((items) =>
            items.map((item) =>
                item.id === account.id
                    ? {
                          ...item,
                          balanceValue: nextAmount,
                          balanceLabel: this.formatMoney(nextAmount, item.currencyCode),
                      }
                    : item,
            ),
        );

        this.transactions.update((items) => [
            this.createTransactionItem({
                id: `t-${Date.now()}`,
                title:
                    draft.description ||
                    (draft.type === 'income' ? 'Новое поступление' : 'Новый расход'),
                category: draft.category,
                accountId: account.id,
                accountName: account.name,
                date: draft.date,
                description: draft.description,
                amountValue: draft.amount,
                tone: draft.type,
                currency: account.currencyCode,
            }),
            ...items,
        ]);

        this.isTransactionDialogOpen.set(false);
        this.transactionDraft.set(this.getDefaultTransactionDraft());
    }

    updateTransferDraft(draft: TransferDraft): void {
        this.transferDraft.set(draft);
    }

    transferBetweenAccounts(): void {
        const draft = this.transferDraft();

        if (!draft.amount || draft.fromAccountId === draft.toAccountId) {
            return;
        }

        this.accounts.update((items) =>
            items.map((item) => {
                if (item.id === draft.fromAccountId) {
                    const nextValue = Math.max(0, item.balanceValue - draft.amount);
                    return {
                        ...item,
                        balanceValue: nextValue,
                        balanceLabel: this.formatMoney(nextValue, item.currencyCode),
                    };
                }

                if (item.id === draft.toAccountId) {
                    const nextValue = item.balanceValue + draft.amount;
                    return {
                        ...item,
                        balanceValue: nextValue,
                        balanceLabel: this.formatMoney(nextValue, item.currencyCode),
                    };
                }

                return item;
            }),
        );

        this.transferDraft.update((value) => ({ ...value, amount: 0 }));
    }

    setNewAccountName(value: string): void {
        this.newAccountName.set(value);
    }

    setNewAccountCurrency(value: string): void {
        this.newAccountCurrency.set(value);
    }

    createNewAccount(): void {
        const name = this.newAccountName().trim();
        const currency = this.newAccountCurrency();

        if (!name) {
            return;
        }

        const colors = ['#23c78b', '#ffd166', '#67a6c1', '#ff8fab', '#c77dff'];
        const color = colors[this.accounts().length % colors.length];
        const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

        this.accounts.update((items) => [
            ...items,
            this.createAccount(id, name, currency, 0, color),
        ]);
        this.transferDraft.update((draft) => ({
            fromAccountId: draft.fromAccountId || id,
            toAccountId: draft.toAccountId || id,
            amount: draft.amount,
        }));
        this.newAccountName.set('');
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
        const name = this.newIncomeCategory().trim();

        if (!name) {
            return;
        }

        this.incomeCategories.update((items) => [
            ...items,
            { id: `income-${Date.now()}`, name, amount: '0%', progress: 8, tone: 'good' },
        ]);
        this.newIncomeCategory.set('');
    }

    addExpenseCategory(): void {
        const name = this.newExpenseCategory().trim();

        if (!name) {
            return;
        }

        this.expenseCategories.update((items) => [
            ...items,
            { id: `expense-${Date.now()}`, name, amount: '0 Br', progress: 0, tone: 'warning' },
        ]);
        this.newExpenseCategory.set('');
    }

    addTagGroup(): void {
        const name = this.newTagGroup().trim();

        if (!name) {
            return;
        }

        const categories = this.expenseCategories()
            .slice(0, 3)
            .map((item) => item.name);

        this.tagGroups.update((items) => [...items, { id: `tag-${Date.now()}`, name, categories }]);
        this.newTagGroup.set('');
    }

    logout(): void {
        const clientId = this.authStore.clientId();

        if (!clientId) {
            this.completeLogout();
            return;
        }

        this.authService
            .logout(clientId)
            .pipe(finalize(() => this.completeLogout()))
            .subscribe({ error: () => undefined });
    }

    private completeLogout(): void {
        this.authStore.clearSession();
        this.router.navigateByUrl('/auth');
    }

    private filterByQuery<T>(items: ReadonlyArray<T>, pickText: (item: T) => string): T[] {
        const query = this.searchQuery().trim().toLowerCase();

        if (!query) {
            return [...items];
        }

        return items.filter((item) => pickText(item).toLowerCase().includes(query));
    }

    private createAccount(
        id: string,
        name: string,
        currency: string,
        balanceValue: number,
        color: string,
    ): AccountBalanceItem {
        return {
            id,
            name,
            currencyCode: currency,
            currencyLabel: this.resolveCurrencyLabel(currency),
            balanceValue,
            balanceLabel: this.formatMoney(balanceValue, currency),
            color,
        };
    }

    private createTransactionItem(params: {
        id: string;
        title: string;
        category: string;
        accountId: string;
        accountName: string;
        date: string;
        description: string;
        amountValue: number;
        tone: 'income' | 'expense';
        currency: string;
    }): TransactionItem {
        const prefix = params.tone === 'income' ? '+' : '-';

        return {
            id: params.id,
            title: params.title,
            category: params.category,
            accountId: params.accountId,
            accountName: params.accountName,
            date: params.date,
            description: params.description,
            amountValue: params.amountValue,
            amountLabel: `${prefix}${this.formatMoney(params.amountValue, params.currency)}`,
            tone: params.tone,
        };
    }

    private getDefaultTransactionDraft(): TransactionDraft {
        return {
            type: 'income',
            accountId: this.accounts()[0]?.id ?? '',
            category: this.incomeCategories()[0]?.name ?? '',
            amount: 0,
            date: '02.06.2026',
            description: '',
        };
    }

    private formatMoney(value: number, currencyCode: string): string {
        const symbol = this.resolveCurrencySymbol(currencyCode);

        return `${new Intl.NumberFormat('ru-RU', {
            minimumFractionDigits: currencyCode === 'RUB' ? 0 : 2,
            maximumFractionDigits: currencyCode === 'RUB' ? 0 : 2,
        }).format(value)} ${symbol}`;
    }

    private resolveCurrencyLabel(currencyCode: string): string {
        return currencyCode === 'BYN' ? 'Белорусский рубль' : currencyCode;
    }

    private resolveCurrencySymbol(currencyCode: string): string {
        return currencyCode === 'BYN' ? 'Br' : currencyCode;
    }
}
