import { MonthBalanceResponse, TransactionResponse } from '../data-access/home-api.models';
import { calculateAccountMonthActivity } from './home-account-activity';

const balance: MonthBalanceResponse = {
    accountId: 'main',
    accountName: 'Main',
    currencyCode: 'BYN',
    year: 2026,
    month: 10,
    openingBalance: 100,
    closingBalance: 300,
    monthChange: 200,
};
function transaction(
    amount: number,
    date: string,
    type = 'Credit',
    accountId = 'main',
): TransactionResponse {
    return {
        id: `${accountId}-${date}`,
        account: { id: accountId },
        category: { type },
        amount,
        date,
    } as TransactionResponse;
}

describe('account month activity', () => {
    it('keeps the peak reached before a transfer, regardless of the journal order', () => {
        const result = calculateAccountMonthActivity(
            [balance],
            [
                transaction(-800, '2026-10-12T10:00:00Z', 'TransferExpense'),
                transaction(1000, '2026-10-11T10:00:00Z'),
                transaction(800, '2026-10-12T10:00:00Z', 'TransferIncome', 'savings'),
                transaction(9000, '2026-09-10T10:00:00Z'),
            ],
        );
        expect(result.get('main')).toEqual({
            opening: 100,
            incoming: 1000,
            outgoing: 800,
            transferIn: 0,
            transferOut: 800,
            closing: 300,
            maximum: 1100,
        });
    });

    it('uses the opening balance as the maximum during a falling or inactive month', () => {
        expect(
            calculateAccountMonthActivity(
                [{ ...balance, closingBalance: 50 }],
                [transaction(-50, '2026-10-11T10:00:00Z', 'Debit')],
            ).get('main')?.maximum,
        ).toBe(100);
        expect(
            calculateAccountMonthActivity([{ ...balance, closingBalance: 100 }], []).get('main')
                ?.maximum,
        ).toBe(100);
    });

    it('does not create a phantom peak for simultaneous movements and supports negative balances', () => {
        const transactions = [
            transaction(100, '2026-10-11T10:00:00Z', 'TransferIncome'),
            transaction(-100, '2026-10-11T10:00:00Z', 'TransferExpense'),
        ];
        const negative = { ...balance, openingBalance: -200, closingBalance: -200 };
        expect(calculateAccountMonthActivity([negative], transactions).get('main')?.maximum).toBe(
            -200,
        );
        expect(
            calculateAccountMonthActivity([negative], transactions.reverse()).get('main')?.maximum,
        ).toBe(-200);
    });

    it('keeps accounts and currencies independent and sums decimal movements accurately', () => {
        const result = calculateAccountMonthActivity(
            [
                { ...balance, openingBalance: 0, closingBalance: 0.3 },
                { ...balance, accountId: 'usd', currencyCode: 'USD', closingBalance: 100 },
            ],
            [transaction(0.1, '2026-10-11T10:00:00Z'), transaction(0.2, '2026-10-11T11:00:00Z')],
        );
        expect(result.get('main')?.maximum).toBe(0.3);
        expect(result.get('main')?.incoming).toBe(0.3);
        expect(result.get('usd')?.maximum).toBe(100);
    });
});
