import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { AddTransactionDialogComponent } from './components/add-transaction-dialog/add-transaction-dialog.component';
import { FirstAccountSetupComponent } from './components/first-account-setup/first-account-setup.component';
import { HomeErrorAlertComponent } from './components/home-error-alert/home-error-alert.component';
import { MainHeaderComponent } from './components/main-header/main-header.component';
import { MainSummaryCardsComponent } from './components/main-summary-cards/main-summary-cards.component';
import { MainEmptyStateComponent } from './components/main-empty-state/main-empty-state.component';
import { MainTabBarComponent } from './components/main-tab-bar/main-tab-bar.component';
import { AccountsTabComponent } from './tab-panels/accounts-tab/accounts-tab.component';
import { AnalyticsTabComponent } from './tab-panels/analytics-tab/analytics-tab.component';
import { CategoriesTabComponent } from './tab-panels/categories-tab/categories-tab.component';
import { OverviewTabComponent } from './tab-panels/overview-tab/overview-tab.component';
import { SettingsTabComponent } from './tab-panels/settings-tab/settings-tab.component';
import { HomeTabId, TransactionDraft, TransactionItem, TransferDraft } from './home-page.models';
import { CURRENCY_OPTIONS, HOME_TABS } from './home-page.constants';
import { HomeDashboardStore } from './home-dashboard.store';

@Component({
    selector: 'app-home-page',
    standalone: true,
    imports: [
        MainHeaderComponent,
        MainSummaryCardsComponent,
        MainEmptyStateComponent,
        MainTabBarComponent,
        OverviewTabComponent,
        AccountsTabComponent,
        AnalyticsTabComponent,
        CategoriesTabComponent,
        SettingsTabComponent,
        AddTransactionDialogComponent,
        FirstAccountSetupComponent,
        HomeErrorAlertComponent,
    ],
    providers: [HomeDashboardStore],
    templateUrl: './home-page.component.html',
    styleUrls: ['./home-page.component.css', './home-page.part-2.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
    readonly authStore = inject(AuthStore);
    readonly dashboard = inject(HomeDashboardStore);
    private readonly authService = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);

    readonly searchControl = new FormControl('', { nonNullable: true });
    readonly accountSearchControl = new FormControl('', { nonNullable: true });
    readonly categorySearchControl = new FormControl('', { nonNullable: true });
    readonly tabs = HOME_TABS;
    readonly currencyOptions = CURRENCY_OPTIONS;
    readonly isErrorDismissing = signal(false);

    readonly activeTab = this.dashboard.activeTab;
    readonly selectedAccountId = this.dashboard.selectedAccountId;
    readonly accountsSelectedAccountId = this.dashboard.accountsSelectedAccountId;
    readonly analyticsSelectedAccountId = this.dashboard.analyticsSelectedAccountId;
    readonly isLoading = this.dashboard.isLoading;
    readonly isSaving = this.dashboard.isSaving;
    readonly isTransferRateLoading = this.dashboard.isTransferRateLoading;
    readonly errorMessage = this.dashboard.errorMessage;
    readonly accountNameError = this.dashboard.accountNameError;
    readonly transferRateError = this.dashboard.transferRateError;
    readonly isServerEmpty = this.dashboard.isServerEmpty;
    readonly needsAccountSetup = this.dashboard.needsAccountSetup;
    readonly isTransactionDialogOpen = this.dashboard.isTransactionDialogOpen;
    readonly isEditingTransaction = this.dashboard.isEditingTransaction;
    readonly newAccountName = this.dashboard.newAccountName;
    readonly newAccountCurrency = this.dashboard.newAccountCurrency;
    readonly newIncomeCategory = this.dashboard.newIncomeCategory;
    readonly newExpenseCategory = this.dashboard.newExpenseCategory;
    readonly newIncomeCategoryColor = this.dashboard.newIncomeCategoryColor;
    readonly newExpenseCategoryColor = this.dashboard.newExpenseCategoryColor;
    readonly newTagGroup = this.dashboard.newTagGroup;
    readonly newTagGroupColor = this.dashboard.newTagGroupColor;
    readonly transferDraft = this.dashboard.transferDraft;
    readonly transactionDraft = this.dashboard.transactionDraft;
    readonly transactionPageSize = this.dashboard.transactionPageSize;
    readonly transactionPagination = this.dashboard.transactionPagination;
    readonly transactionPageSizeOptions = this.dashboard.transactionPageSizeOptions;
    readonly accounts = this.dashboard.accounts;
    readonly accountList = this.dashboard.accountList;
    readonly visibleAccounts = this.dashboard.visibleAccounts;
    readonly filteredTransactions = this.dashboard.filteredTransactions;
    readonly incomeCategories = this.dashboard.incomeCategories;
    readonly expenseCategories = this.dashboard.expenseCategories;
    readonly analyticsIncomeCategories = this.dashboard.analyticsIncomeCategories;
    readonly analyticsExpenseCategories = this.dashboard.analyticsExpenseCategories;
    readonly filteredIncomeCategories = this.dashboard.filteredIncomeCategories;
    readonly filteredExpenseCategories = this.dashboard.filteredExpenseCategories;
    readonly tagGroups = this.dashboard.tagGroups;
    readonly filteredTagGroups = this.dashboard.filteredTagGroups;
    readonly toolbarAccountOptions = this.dashboard.toolbarAccountOptions;
    readonly accountOptions = this.dashboard.accountOptions;
    readonly applicationCurrencyCode = this.dashboard.applicationCurrencyCode;
    readonly accountSummaryBalance = this.dashboard.accountSummaryBalance;
    readonly accountSummaryBalanceLabel = this.dashboard.accountSummaryBalanceLabel;
    readonly allCategoryOptions = this.dashboard.allCategoryOptions;
    readonly incomeCategoryOptions = this.dashboard.incomeCategoryOptions;
    readonly expenseCategoryOptions = this.dashboard.expenseCategoryOptions;
    readonly monthLabel = this.dashboard.monthLabel;
    readonly incomeVsExpense = this.dashboard.incomeVsExpense;
    readonly categoryMonthTable = this.dashboard.categoryMonthTable;
    readonly monthlyExpensesChart = this.dashboard.monthlyExpensesChart;
    readonly balanceDynamicsChart = this.dashboard.balanceDynamicsChart;
    readonly savingsRateChart = this.dashboard.savingsRateChart;
    readonly tagExpensesChart = this.dashboard.tagExpensesChart;
    readonly topExpensesChart = this.dashboard.topExpensesChart;
    readonly analyticsMetrics = this.dashboard.analyticsMetrics;
    readonly summaryCards = this.dashboard.summaryCards;
    readonly activeTabTitle = this.dashboard.activeTabTitle;
    readonly activeTabDescription = this.dashboard.activeTabDescription;
    readonly transactionCurrencyCode = computed(() => {
        const accountId = this.transactionDraft().accountId;
        const selectedAccount = this.accounts().find((account) => account.id === accountId);

        return selectedAccount?.currencyCode ?? this.applicationCurrencyCode();
    });

    private dismissErrorTimeoutId: number | null = null;

    constructor() {
        this.searchControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => this.dashboard.setSearchQuery(value ?? ''));
        this.accountSearchControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => this.dashboard.setAccountSearchQuery(value ?? ''));
        this.categorySearchControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => this.dashboard.setCategorySearchQuery(value ?? ''));

        if (!this.authStore.isAuthenticated()) {
            void this.router.navigateByUrl('/auth');
            return;
        }

        this.destroyRef.onDestroy(() => this.clearDismissErrorTimeout());
        this.dashboard.loadDashboard();
    }

    reloadDashboard(): void {
        this.isErrorDismissing.set(false);
        this.dashboard.loadDashboard();
    }

    dismissError(): void {
        if (!this.errorMessage() || this.isErrorDismissing()) {
            return;
        }

        this.isErrorDismissing.set(true);

        this.dismissErrorTimeoutId = window.setTimeout(() => {
            this.dismissErrorTimeoutId = null;
            this.dashboard.dismissError();
            this.isErrorDismissing.set(false);
        }, 180);
    }

    setActiveTab(tab: HomeTabId): void {
        this.dashboard.setActiveTab(tab);
    }

    openSettings(): void {
        this.dashboard.setActiveTab('settings');
    }

    setAccountFilter(accountId: string): void {
        this.dashboard.setAccountFilter(accountId);
    }

    setAccountsAccountFilter(accountId: string): void {
        this.dashboard.setAccountsAccountFilter(accountId);
    }

    setAnalyticsAccountFilter(accountId: string): void {
        this.dashboard.setAnalyticsAccountFilter(accountId);
    }

    setTransactionPageSize(size: number): void {
        this.dashboard.setTransactionPageSize(size);
    }

    goToTransactionPage(page: number): void {
        this.dashboard.goToTransactionPage(page);
    }

    goToPreviousMonth(): void {
        this.dashboard.goToPreviousMonth();
    }

    goToNextMonth(): void {
        this.dashboard.goToNextMonth();
    }

    startAddingTransaction(): void {
        this.dashboard.startAddingTransaction();
    }

    startEditingTransaction(transaction: TransactionItem): void {
        this.dashboard.startEditingTransaction(transaction);
    }

    closeTransactionDialog(): void {
        this.dashboard.closeTransactionDialog();
    }

    updateTransactionDraft(draft: TransactionDraft): void {
        this.dashboard.updateTransactionDraft(draft);
    }

    saveTransaction(): void {
        this.dashboard.saveTransaction();
    }

    deleteTransaction(transactionId: string): void {
        this.dashboard.deleteTransaction(transactionId);
    }

    updateTransferDraft(draft: TransferDraft): void {
        this.dashboard.updateTransferDraft(draft);
    }

    transferBetweenAccounts(): void {
        this.dashboard.transferBetweenAccounts();
    }

    setNewAccountName(value: string): void {
        this.dashboard.setNewAccountName(value);
    }

    setNewAccountCurrency(value: string): void {
        this.dashboard.setNewAccountCurrency(value);
    }

    updateApplicationCurrency(value: string): void {
        this.dashboard.setApplicationCurrencyCode(value);
    }

    createNewAccount(): void {
        this.dashboard.createNewAccount();
    }

    createPrimaryAccount(): void {
        this.dashboard.createPrimaryAccount();
    }

    deleteAccount(accountId: string): void {
        this.dashboard.deleteAccount(accountId);
    }

    setNewIncomeCategory(value: string): void {
        this.dashboard.setNewIncomeCategory(value);
    }

    setNewExpenseCategory(value: string): void {
        this.dashboard.setNewExpenseCategory(value);
    }

    setNewIncomeCategoryColor(value: string): void {
        this.dashboard.setNewIncomeCategoryColor(value);
    }

    setNewExpenseCategoryColor(value: string): void {
        this.dashboard.setNewExpenseCategoryColor(value);
    }

    setNewTagGroup(value: string): void {
        this.dashboard.setNewTagGroup(value);
    }

    setNewTagGroupColor(value: string): void {
        this.dashboard.setNewTagGroupColor(value);
    }

    addIncomeCategory(): void {
        this.dashboard.addIncomeCategory();
    }

    addExpenseCategory(): void {
        this.dashboard.addExpenseCategory();
    }

    deleteCategory(categoryId: string): void {
        this.dashboard.deleteCategory(categoryId);
    }

    addTagGroup(): void {
        this.dashboard.addTagGroup();
    }

    deleteTag(tagId: string): void {
        this.dashboard.deleteTag(tagId);
    }

    assignCategoryToTag(event: { tagId: string; categoryId: string }): void {
        this.dashboard.assignCategoryToTag(event.tagId, event.categoryId);
    }

    removeCategoryFromTag(event: { tagId: string; categoryId: string }): void {
        this.dashboard.removeCategoryFromTag(event.tagId, event.categoryId);
    }

    logout(): void {
        this.authService
            .logout()
            .pipe(
                finalize(() => this.completeLogout()),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({ error: () => undefined });
    }

    private completeLogout(): void {
        this.authStore.clearSession();
        this.router.navigateByUrl('/auth');
    }

    private clearDismissErrorTimeout(): void {
        if (this.dismissErrorTimeoutId === null) {
            return;
        }

        window.clearTimeout(this.dismissErrorTimeoutId);
        this.dismissErrorTimeoutId = null;
    }
}
