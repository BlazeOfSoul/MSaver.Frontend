import { AccountResponse, MonthBalanceResponse } from '../data-access/home-api.models';
import { apiMonthKey, monthKey } from './home-date.utils';

type BalanceAccount = Pick<AccountResponse, 'id'>;
type BalanceKeySource = Pick<MonthBalanceResponse, 'accountId' | 'year' | 'month'>;

export function getMonthBalanceCacheKey(accountId: string, year: number, month: number): string {
    return `${accountId}:${apiMonthKey(year, month)}`;
}

export function findMissingBalanceMonths(
    accounts: ReadonlyArray<BalanceAccount>,
    balances: ReadonlyArray<BalanceKeySource>,
    months: ReadonlyArray<Date>,
): Date[] {
    if (!accounts.length) {
        return [];
    }

    const loadedBalanceKeys = new Set(
        balances.map((balance) =>
            getMonthBalanceCacheKey(balance.accountId, balance.year, balance.month),
        ),
    );

    return months.filter((month) =>
        accounts.some(
            (account) =>
                !loadedBalanceKeys.has(
                    getMonthBalanceCacheKey(
                        account.id,
                        month.getFullYear(),
                        month.getMonth() + 1,
                    ),
                ),
        ),
    );
}

export function mergeMonthBalanceCache(
    currentBalances: ReadonlyArray<MonthBalanceResponse>,
    incomingBalances: ReadonlyArray<MonthBalanceResponse>,
): MonthBalanceResponse[] {
    const nextBalancesByKey = new Map(
        currentBalances.map((balance) => [
            getMonthBalanceCacheKey(balance.accountId, balance.year, balance.month),
            balance,
        ]),
    );

    incomingBalances.forEach((balance) => {
        nextBalancesByKey.set(
            getMonthBalanceCacheKey(balance.accountId, balance.year, balance.month),
            balance,
        );
    });

    return [...nextBalancesByKey.values()];
}

export function keepSelectedMonthBalanceForYear(
    balances: ReadonlyArray<MonthBalanceResponse>,
    selectedMonth: Date,
): MonthBalanceResponse[] {
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthKey = monthKey(selectedMonth);

    return balances.filter(
        (balance) =>
            balance.year !== selectedYear ||
            apiMonthKey(balance.year, balance.month) === selectedMonthKey,
    );
}
