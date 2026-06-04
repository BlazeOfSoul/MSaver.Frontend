import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
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
import { HomeTabId, TransactionDraft, TransferDraft } from './home-page.models';
import { CURRENCY_OPTIONS, HOME_TABS } from './home-page.constants';
import { HomeDashboardStore } from './home-dashboard.store';

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
    providers: [HomeDashboardStore],
    templateUrl: './home-page.component.html',
    styleUrl: './home-page.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
    readonly authStore = inject(AuthStore);
    readonly dashboard = inject(HomeDashboardStore);
    private readonly authService = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);

    readonly searchControl = new FormControl('', { nonNullable: true });
    readonly tabs = HOME_TABS;
    readonly currencyOptions = CURRENCY_OPTIONS;

    readonly activeTab = this.dashboard.activeTab;
    readonly selectedAccountId = this.dashboard.selectedAccountId;
    readonly isLoading = this.dashboard.isLoading;
    readonly isSaving = this.dashboard.isSaving;
    readonly errorMessage = this.dashboard.errorMessage;
    readonly isServerEmpty = this.dashboard.isServerEmpty;
    readonly isTransactionDialogOpen = this.dashboard.isTransactionDialogOpen;
    readonly newAccountName = this.dashboard.newAccountName;
    readonly newAccountCurrency = this.dashboard.newAccountCurrency;
    readonly newIncomeCategory = this.dashboard.newIncomeCategory;
    readonly newExpenseCategory = this.dashboard.newExpenseCategory;
    readonly newTagGroup = this.dashboard.newTagGroup;
    readonly transferDraft = this.dashboard.transferDraft;
    readonly transactionDraft = this.dashboard.transactionDraft;
    readonly accounts = this.dashboard.accounts;
    readonly visibleAccounts = this.dashboard.visibleAccounts;
    readonly filteredTransactions = this.dashboard.filteredTransactions;
    readonly incomeCategories = this.dashboard.incomeCategories;
    readonly expenseCategories = this.dashboard.expenseCategories;
    readonly tagGroups = this.dashboard.tagGroups;
    readonly toolbarAccountOptions = this.dashboard.toolbarAccountOptions;
    readonly accountOptions = this.dashboard.accountOptions;
    readonly allCategoryOptions = this.dashboard.allCategoryOptions;
    readonly incomeCategoryOptions = this.dashboard.incomeCategoryOptions;
    readonly expenseCategoryOptions = this.dashboard.expenseCategoryOptions;
    readonly monthLabel = this.dashboard.monthLabel;
    readonly incomeVsExpense = this.dashboard.incomeVsExpense;
    readonly monthlyExpensesChart = this.dashboard.monthlyExpensesChart;
    readonly balanceDynamicsChart = this.dashboard.balanceDynamicsChart;
    readonly tagExpensesChart = this.dashboard.tagExpensesChart;
    readonly topExpensesChart = this.dashboard.topExpensesChart;
    readonly yearStatsChart = this.dashboard.yearStatsChart;
    readonly analyticsMetrics = this.dashboard.analyticsMetrics;
    readonly summaryCards = this.dashboard.summaryCards;
    readonly recordsCount = this.dashboard.recordsCount;
    readonly activeTabTitle = this.dashboard.activeTabTitle;
    readonly activeTabDescription = this.dashboard.activeTabDescription;

    constructor() {
        this.searchControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => this.dashboard.setSearchQuery(value ?? ''));

        this.dashboard.loadDashboard();
    }

    reloadDashboard(): void {
        this.dashboard.loadDashboard();
    }

    setActiveTab(tab: HomeTabId): void {
        this.dashboard.setActiveTab(tab);
    }

    setAccountFilter(accountId: string): void {
        this.dashboard.setAccountFilter(accountId);
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

    createNewAccount(): void {
        this.dashboard.createNewAccount();
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

    setNewTagGroup(value: string): void {
        this.dashboard.setNewTagGroup(value);
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
        const clientId = this.authStore.clientId();

        if (!clientId) {
            this.completeLogout();
            return;
        }

        this.authService
            .logout(clientId)
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
}
