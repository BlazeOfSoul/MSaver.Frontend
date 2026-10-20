import { MonthBalanceResponse, TransactionResponse } from '../data-access/home-api.models';
import { apiDateMonthKey, apiDateTimestamp, apiMonthKey } from './home-date.utils';

export interface AccountMonthActivity {
    opening: number;
    incoming: number;
    outgoing: number;
    transferIn: number;
    transferOut: number;
    closing: number;
    maximum: number;
}

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateAccountMonthActivity(
    balances: ReadonlyArray<MonthBalanceResponse>,
    transactions: ReadonlyArray<TransactionResponse>,
): ReadonlyMap<string, AccountMonthActivity> {
    const result = new Map<string, AccountMonthActivity>();
    const entries = new Map<string, TransactionResponse[]>();
    for (const transaction of transactions) {
        const key = `${transaction.account.id}:${apiDateMonthKey(transaction.date)}`;
        const items = entries.get(key) ?? [];
        items.push(transaction);
        entries.set(key, items);
    }
    for (const balance of balances) {
        const activity: AccountMonthActivity = {
            opening: balance.openingBalance,
            incoming: 0,
            outgoing: 0,
            transferIn: 0,
            transferOut: 0,
            closing: balance.closingBalance,
            maximum: balance.openingBalance,
        };
        const changes = new Map<number, number>();
        const key = `${balance.accountId}:${apiMonthKey(balance.year, balance.month)}`;
        for (const transaction of entries.get(key) ?? []) {
            const amount = transaction.amount;
            if (amount >= 0) activity.incoming += amount;
            else activity.outgoing -= amount;
            if (transaction.category.type === 'TransferIncome') activity.transferIn += amount;
            if (transaction.category.type === 'TransferExpense') activity.transferOut -= amount;
            const time = apiDateTimestamp(transaction.date);
            // Changes at the same instant are atomic; their API ordering is not chronological.
            changes.set(time, (changes.get(time) ?? 0) + amount);
        }
        let running = activity.opening;
        for (const [, change] of [...changes].sort(([a], [b]) => a - b)) {
            running = roundMoney(running + change);
            activity.maximum = Math.max(activity.maximum, running);
        }
        activity.maximum = Math.max(activity.maximum, activity.closing);
        activity.incoming = roundMoney(activity.incoming);
        activity.outgoing = roundMoney(activity.outgoing);
        activity.transferIn = roundMoney(activity.transferIn);
        activity.transferOut = roundMoney(activity.transferOut);
        result.set(balance.accountId, activity);
    }
    return result;
}
