import { MonthBalanceResponse } from '../data-access/home-api.models';
import {
    findMissingBalanceMonths,
    keepSelectedMonthBalanceForYear,
    mergeMonthBalanceCache,
} from './home-balance-cache.utils';

function balance(overrides: Partial<MonthBalanceResponse>): MonthBalanceResponse {
    return {
        accountId: 'account-1',
        accountName: 'Main',
        currencyCode: 'BYN',
        openingBalance: 0,
        monthChange: 0,
        closingBalance: 0,
        year: 2026,
        month: 6,
        ...overrides,
    };
}

describe('home balance cache utils', () => {
    it('returns only months missing at least one account balance', () => {
        const accounts = [{ id: 'account-1' }, { id: 'account-2' }];
        const may = new Date(2026, 4, 1);
        const june = new Date(2026, 5, 1);
        const july = new Date(2026, 6, 1);
        const existingBalances = [
            balance({ accountId: 'account-1', year: 2026, month: 5 }),
            balance({ accountId: 'account-2', year: 2026, month: 5 }),
            balance({ accountId: 'account-1', year: 2026, month: 6 }),
            balance({ accountId: 'account-2', year: 2026, month: 7 }),
        ];

        expect(findMissingBalanceMonths(accounts, existingBalances, [may, june, july])).toEqual([
            june,
            july,
        ]);
    });

    it('merges incoming balances by account and month without duplicating stale values', () => {
        const current = [
            balance({ accountId: 'account-1', year: 2026, month: 6, closingBalance: 10 }),
            balance({ accountId: 'account-2', year: 2026, month: 6, closingBalance: 20 }),
        ];
        const incoming = [
            balance({ accountId: 'account-1', year: 2026, month: 6, closingBalance: 30 }),
            balance({ accountId: 'account-1', year: 2026, month: 7, closingBalance: 40 }),
        ];

        expect(mergeMonthBalanceCache(current, incoming).map((item) => item.closingBalance)).toEqual(
            [30, 20, 40],
        );
    });

    it('keeps only the selected month for the selected year', () => {
        const balances = [
            balance({ year: 2025, month: 12, closingBalance: 12 }),
            balance({ year: 2026, month: 5, closingBalance: 5 }),
            balance({ year: 2026, month: 6, closingBalance: 6 }),
        ];

        expect(keepSelectedMonthBalanceForYear(balances, new Date(2026, 5, 1))).toEqual([
            balances[0],
            balances[2],
        ]);
    });
});
