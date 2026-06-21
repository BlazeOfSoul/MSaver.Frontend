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
import { safeHexColor } from './home-color.utils';
import {
    formatDate,
    formatDateTime,
    formatMoney,
    formatSignedMoney,
    resolveCurrencyLabel,
    safeText,
} from './home-formatters';

export function mapAccount(
    account: AccountResponse,
    index: number,
    balance?: MonthBalanceResponse,
): AccountBalanceItem {
    const balanceValue = balance?.closingBalance ?? account.currentBalance;
    const monthChangeValue = balance?.monthChange ?? 0;
    const currencyCode = safeText(account.currencyCode, '');

    return {
        id: account.id,
        name: safeText(account.name, 'Счёт без названия'),
        currencyCode,
        currencyLabel: resolveCurrencyLabel(currencyCode),
        balanceValue,
        balanceLabel: formatMoney(balanceValue, currencyCode),
        monthChangeValue,
        monthChangeLabel: formatSignedMoney(monthChangeValue, currencyCode),
        color: safeHexColor(account.color, ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]),
        isPrimary: !!account.isPrimary,
    };
}

export function mapTransaction(transaction: TransactionResponse): TransactionItem {
    const categoryType = transaction.category.type ?? null;
    const tone = resolveTransactionTone(transaction.amount, categoryType);
    const amount = Math.abs(transaction.amount);
    const categoryName = safeText(transaction.category.name, 'Категория без названия');
    const accountName = safeText(transaction.account.name, 'Счёт без названия');
    const description = safeText(transaction.description, '');

    return {
        id: transaction.id,
        title: description || categoryName,
        category: categoryName,
        categoryId: transaction.category.id,
        categoryType,
        categoryColor: safeHexColor(transaction.category.color, CATEGORY_COLORS[0]),
        accountId: transaction.account.id,
        accountName,
        date: formatDate(transaction.date),
        dateValue: transaction.date,
        dateTimeLabel: formatDateTime(transaction.date),
        timestamp: readTimestamp(transaction.date),
        description,
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
    currencyCode = 'BYN',
    readAmount: (transaction: TransactionResponse) => number = (transaction) =>
        Math.abs(transaction.amount),
): CategoryBreakdownItem[] {
    const categoryType = type === 'income' ? 'Credit' : 'Debit';
    const visibleCategories = categories.filter((category) => category.type === categoryType);
    const totals = categoryTotals(transactions, readAmount);
    const max = Math.max(1, ...visibleCategories.map((category) => totals.get(category.id) ?? 0));

    return visibleCategories.map((category) => {
        const amountValue = totals.get(category.id) ?? 0;
        const progress = Math.round((amountValue / max) * 100);

        return {
            id: category.id,
            name: safeText(category.name, 'Категория без названия'),
            amount: formatMoney(amountValue, currencyCode),
            amountValue,
            progress,
            color: safeHexColor(category.color, CATEGORY_COLORS[0]),
            type,
            tone: type === 'income' ? 'good' : resolveExpenseTone(progress),
            isSystem: !!category.isSystem,
        };
    });
}

export function mapTags(tags: ReadonlyArray<TagDetailsResponse>): TagGroupItem[] {
    return tags
        .filter((tag) => !tag.isDeleted)
        .map((tag, index) => ({
            id: tag.id,
            name: safeText(tag.name, 'Тег без названия'),
            color: safeHexColor(tag.color, CATEGORY_COLORS[index % CATEGORY_COLORS.length]),
            categories: tag.categories
                .filter((category) => !category.isDeleted)
                .map((category) => ({
                    id: category.id,
                    name: safeText(category.name, 'Категория без названия'),
                    color: safeHexColor(category.color, CATEGORY_COLORS[0]),
                    type: isExpenseCategory(category.type) ? 'expense' : 'income',
                })),
        }));
}

export function categoryTotals(
    transactions: ReadonlyArray<TransactionResponse>,
    readAmount: (transaction: TransactionResponse) => number = (transaction) =>
        Math.abs(transaction.amount),
): Map<string, number> {
    const totals = new Map<string, number>();

    transactions.forEach((transaction) => {
        const current = totals.get(transaction.category.id) ?? 0;
        totals.set(transaction.category.id, current + readAmount(transaction));
    });

    return totals;
}

export function isExpenseCategory(type: CategoryType | null | undefined): boolean {
    return type === 'Debit' || type === 'TransferExpense';
}

function resolveTransactionTone(
    amount: number,
    categoryType: CategoryType | null | undefined,
): 'income' | 'expense' {
    if (amount < 0) {
        return 'expense';
    }

    if (amount > 0) {
        return 'income';
    }

    return isExpenseCategory(categoryType) ? 'expense' : 'income';
}

function resolveExpenseTone(progress: number): 'warning' | 'danger' {
    return progress >= 75 ? 'danger' : 'warning';
}

function readTimestamp(value: string): number {
    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
}
