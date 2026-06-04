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
    color: string;
}

export interface TransferDraft {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
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
    progress: number;
    tone: 'good' | 'warning' | 'danger';
}

export interface TagGroupItem {
    id: string;
    name: string;
    categories: string[];
}

export interface TransactionDraft {
    type: 'income' | 'expense';
    accountId: string;
    category: string;
    amount: number;
    date: string;
    description: string;
}
