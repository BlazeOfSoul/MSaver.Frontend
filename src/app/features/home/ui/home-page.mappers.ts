import {
    AccountResponse,
    CategoryResponse,
    CategoryType,
    MonthBalanceResponse,
    TagDetailsResponse,
    TransactionResponse,
} from '../data-access/home-api.models';
import {
    AccountBalanceItem,
    CategoryBreakdownItem,
    TagGroupItem,
    TransactionItem,
} from './home-page.models';
import { ACCOUNT_COLORS, CATEGORY_COLORS } from './home-page.constants';
import {
    formatDate,
    formatMoney,
    formatSignedMoney,
    resolveCurrencyLabel,
} from './home-formatters';

export function mapAccount(
    account: AccountResponse,
    index: number,
    balance?: MonthBalanceResponse,
): AccountBalanceItem {
    const balanceValue = balance?.closingBalance ?? account.currentBalance;
    const monthChangeValue = balance?.monthChange ?? 0;

    return {
        id: account.id,
        name: account.name,
        currencyCode: account.currencyCode,
        currencyLabel: resolveCurrencyLabel(account.currencyCode),
        balanceValue,
        balanceLabel: formatMoney(balanceValue, account.currencyCode),
        monthChangeValue,
        monthChangeLabel: formatSignedMoney(monthChangeValue, account.currencyCode),
        color: account.color || ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
    };
}

export function mapTransaction(transaction: TransactionResponse): TransactionItem {
    const tone = isExpenseCategory(transaction.category.type) ? 'expense' : 'income';
    const amount = Math.abs(transaction.amount);

    return {
        id: transaction.id,
        title: transaction.description || transaction.category.name,
        category: transaction.category.name,
        categoryId: transaction.category.id,
        categoryType: transaction.category.type,
        accountId: transaction.account.id,
        accountName: transaction.account.name,
        date: formatDate(transaction.date),
        description: transaction.description,
        amountValue: amount,
        amountLabel: `${tone === 'income' ? '+' : '-'}${formatMoney(
            amount,
            transaction.account.currencyCode,
        )}`,
        tone,
    };
}

export function mapCategories(
    categories: ReadonlyArray<CategoryResponse>,
    transactions: ReadonlyArray<TransactionResponse>,
    type: 'income' | 'expense',
): CategoryBreakdownItem[] {
    const categoryType = type === 'income' ? 'Credit' : 'Debit';
    const visibleCategories = categories.filter((category) => category.type === categoryType);
    const totals = categoryTotals(transactions);
    const max = Math.max(1, ...visibleCategories.map((category) => totals.get(category.id) ?? 0));

    return visibleCategories.map((category) => {
        const amountValue = totals.get(category.id) ?? 0;
        const progress = Math.round((amountValue / max) * 100);

        return {
            id: category.id,
            name: category.name,
            amount: formatMoney(amountValue, 'BYN'),
            amountValue,
            progress,
            color: category.color || CATEGORY_COLORS[0],
            type,
            tone: type === 'income' ? 'good' : resolveExpenseTone(progress),
        };
    });
}

export function mapTags(tags: ReadonlyArray<TagDetailsResponse>): TagGroupItem[] {
    return tags.map((tag, index) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        categories: tag.categories
            .filter((category) => !category.isDeleted)
            .map((category) => ({
                id: category.id,
                name: category.name,
                type: isExpenseCategory(category.type) ? 'expense' : 'income',
            })),
    }));
}

export function categoryTotals(
    transactions: ReadonlyArray<TransactionResponse>,
): Map<string, number> {
    const totals = new Map<string, number>();

    transactions.forEach((transaction) => {
        const current = totals.get(transaction.category.id) ?? 0;
        totals.set(transaction.category.id, current + Math.abs(transaction.amount));
    });

    return totals;
}

export function isExpenseCategory(type: CategoryType): boolean {
    return type === 'Debit' || type === 'TransferExpense';
}

function resolveExpenseTone(progress: number): 'warning' | 'danger' {
    return progress >= 75 ? 'danger' : 'warning';
}
