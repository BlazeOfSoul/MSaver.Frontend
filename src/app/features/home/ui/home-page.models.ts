export type HomeTabId = 'overview' | 'accounts' | 'analytics' | 'categories' | 'settings';

export interface HomeTabItem {
    id: HomeTabId;
    label: string;
    icon: string;
}

export interface HomeSummaryCard {
    id: string;
    label: string;
    value: string;
    helper: string;
    helperLines?: ReadonlyArray<string>;
    tone: 'primary' | 'positive' | 'negative' | 'neutral';
    icon: string;
}

export interface TransactionItem {
    id: string;
    title: string;
    category: string;
    categoryDetail?: string;
    categoryDebtBadge?: string;
    categoryId: string;
    categoryType: 'Debit' | 'Credit' | 'TransferIncome' | 'TransferExpense';
    categoryColor: string;
    accountId: string;
    accountName: string;
    date: string;
    dateValue: string;
    dateTimeLabel: string;
    timestamp: number;
    description: string;
    amountLabel: string;
    amountValue: number;
    tone: 'income' | 'expense';
}

export interface TransactionPagination {
    page: number;
    size: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface AccountBalanceItem {
    id: string;
    name: string;
    currencyCode: string;
    currencyLabel: string;
    balanceLabel: string;
    balanceValue: number;
    monthChangeLabel: string;
    monthChangeValue: number;
    color: string;
    isPrimary: boolean;
}

export interface TransferDraft {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    rate: number | null;
    description: string;
}

export interface AnalyticsMetricCard {
    id: string;
    label: string;
    value: string;
    caption: string;
}

export type HomeChartType = 'bar' | 'line' | 'doughnut';

export interface HomeChartDataset {
    label: string;
    data: number[];
    color: string;
    colors?: string[];
    fill?: boolean;
}

export interface AnalyticsSeriesPoint {
    label: string;
    value: number;
}

export interface AnalyticsStackedPoint {
    label: string;
    income: number;
    expense: number;
}

export interface AnalyticsCategoryMonthCell {
    label: string;
    value: number;
    formattedValue: string;
}

export interface AnalyticsCategoryMonthSummary {
    cells: ReadonlyArray<AnalyticsCategoryMonthCell>;
    totalValue: number;
    formattedTotal: string;
    averageValue: number;
    formattedAverage: string;
}

export interface AnalyticsCategoryMonthRow {
    id: string;
    name: string;
    color: string;
    type: 'income' | 'expense' | 'debt';
    cells: ReadonlyArray<AnalyticsCategoryMonthCell>;
    totalValue: number;
    formattedTotal: string;
    averageValue: number;
    formattedAverage: string;
}

export interface AnalyticsCategoryMonthTable {
    months: ReadonlyArray<string>;
    incomeRows: ReadonlyArray<AnalyticsCategoryMonthRow>;
    expenseRows: ReadonlyArray<AnalyticsCategoryMonthRow>;
    debtRows?: ReadonlyArray<AnalyticsCategoryMonthRow>;
    incomeSummary?: AnalyticsCategoryMonthSummary;
    expenseSummary?: AnalyticsCategoryMonthSummary;
    debtSummary?: AnalyticsCategoryMonthSummary;
}

export interface CategoryBreakdownItem {
    id: string;
    name: string;
    displayName?: string;
    debtBadgeLabel?: string;
    debtHelper?: string;
    debtTone?: 'owed-by-me' | 'owed-to-me';
    amount: string;
    amountValue: number;
    progress: number;
    color: string;
    type: 'income' | 'expense';
    tone: 'good' | 'warning' | 'danger';
    isSystem: boolean;
}

export interface TagGroupItem {
    id: string;
    name: string;
    color: string;
    categories: ReadonlyArray<TagCategoryItem>;
}

export interface TagCategoryItem {
    id: string;
    name: string;
    color: string;
    type: 'income' | 'expense';
}

export interface TransactionDraft {
    type: 'income' | 'expense';
    accountId: string;
    categoryId: string;
    amount: number;
    date: string;
    description: string;
}
