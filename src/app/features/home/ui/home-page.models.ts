export type HomeTabId = 'overview' | 'accounts' | 'analytics' | 'categories';

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
    tone: 'primary' | 'positive' | 'negative' | 'neutral';
    icon: string;
}

export interface TransactionItem {
    id: string;
    title: string;
    category: string;
    categoryId: string;
    categoryType: 'Debit' | 'Credit' | 'TransferIncome' | 'TransferExpense';
    accountId: string;
    accountName: string;
    date: string;
    description: string;
    amountLabel: string;
    amountValue: number;
    tone: 'income' | 'expense';
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

export interface CategoryBreakdownItem {
    id: string;
    name: string;
    amount: string;
    amountValue: number;
    progress: number;
    color: string;
    type: 'income' | 'expense';
    tone: 'good' | 'warning' | 'danger';
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
