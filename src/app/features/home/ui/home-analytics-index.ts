import { TransactionResponse } from '../data-access/home-api.models';
import { apiDateMonthKey } from './home-date.utils';
import { isExpenseOperationTransaction, isIncomeOperationTransaction } from './home-page.mappers';

export function indexTransactionsByMonth(
    transactions: readonly TransactionResponse[],
): Map<string, TransactionResponse[]> {
    const index = new Map<string, TransactionResponse[]>();
    for (const transaction of transactions) {
        const key = apiDateMonthKey(transaction.date);
        if (!key) continue;
        const month = index.get(key) ?? [];
        month.push(transaction);
        index.set(key, month);
    }
    return index;
}

export function indexCategoryMonthTotals(
    transactions: readonly TransactionResponse[],
    convert: (transaction: TransactionResponse) => number,
): Map<string, number> {
    const totals = new Map<string, number>();
    for (const transaction of transactions) {
        if (
            !isExpenseOperationTransaction(transaction) &&
            !isIncomeOperationTransaction(transaction)
        )
            continue;
        const key = transaction.category.id + ':' + apiDateMonthKey(transaction.date);
        totals.set(key, (totals.get(key) ?? 0) + Math.abs(convert(transaction)));
    }
    return totals;
}
