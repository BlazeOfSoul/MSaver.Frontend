import { TransactionResponse } from '../data-access/home-api.models';
import { summarizeAccountTransfers } from './home-transfer-summary';

function transaction(
    accountId: string,
    currency: string,
    type: TransactionResponse['category']['type'],
    amount: number,
): TransactionResponse {
    return {
        id: crypto.randomUUID(),
        date: '2026-09-01T12:00:00Z',
        description: '',
        amount,
        account: {
            id: accountId,
            name: accountId,
            currencyCode: currency,
            color: null,
            isArchived: false,
        },
        category: { id: type, name: type, type, color: '#23c78b' },
    };
}

describe('Account transfer summary', () => {
    it('shows where funds moved without adding both sides or mixing currencies', () => {
        const rows = summarizeAccountTransfers(
            [
                transaction('USD reserve', 'USD', 'TransferExpense', -10),
                transaction('Main', 'BYN', 'TransferIncome', 32),
                transaction('Main', 'BYN', 'TransferExpense', -25),
                transaction('Home', 'BYN', 'TransferIncome', 25),
                transaction('Main', 'BYN', 'Credit', 1000),
                transaction('Main', 'BYN', 'Debit', -400),
            ],
            [],
        );
        expect(rows.map((row) => [row.name, row.currency, row.net])).toEqual([
            ['Home', 'BYN', 25],
            ['Main', 'BYN', 7],
            ['USD reserve', 'USD', -10],
        ]);
        expect(rows.find((row) => row.id === 'Main')).toMatchObject({ incoming: 32, outgoing: 25 });
    });

    it('retains accounts with real turnover and zero net change', () => {
        const rows = summarizeAccountTransfers(
            [
                transaction('Main', 'BYN', 'TransferIncome', 0.1),
                transaction('Main', 'BYN', 'TransferIncome', 0.2),
                transaction('Main', 'BYN', 'TransferExpense', -0.3),
            ],
            [],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].net).toBe(0);
    });
});
