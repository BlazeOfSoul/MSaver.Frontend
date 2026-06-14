import {
    calculateDebtSummary,
    calculateDebtTotalsUntilMonth,
    resolveDebtCategoryKind,
} from './home-debt.utils';

interface DebtTransactionFixture {
    category: {
        name: string;
    };
    date: string;
    amount: number;
}

function transaction(
    categoryName: string,
    amount: number,
    date = '2026-06-05T12:00:00',
): DebtTransactionFixture {
    return {
        category: {
            name: categoryName,
        },
        date,
        amount,
    };
}

describe('home debt utils', () => {
    it('resolves known debt category names', () => {
        expect(resolveDebtCategoryKind('Взято в долг (+)')).toBe('taken');
        expect(resolveDebtCategoryKind('Возвращено по долгу (-)')).toBe('returned');
        expect(resolveDebtCategoryKind('Дано в долг (-)')).toBe('given');
        expect(resolveDebtCategoryKind('Отдано по долгу (+)')).toBe('received');
        expect(resolveDebtCategoryKind('Получено по долгу (+)')).toBe('received');
        expect(resolveDebtCategoryKind('Вернули долг')).toBe('received');
        expect(resolveDebtCategoryKind('Продукты')).toBeNull();
    });

    it('calculates debt summary from debt transactions only', () => {
        const transactions = [
            transaction('Взято в долг (+)', 300),
            transaction('Возвращено по долгу (-)', -100),
            transaction('Дано в долг (-)', -200),
            transaction('Отдано по долгу (+)', 50),
            transaction('Продукты', -999),
        ];

        expect(calculateDebtSummary(transactions, 1000, (item) => item.amount)).toEqual({
            owedByMe: 200,
            owedToMe: 150,
            balanceAfterClosing: 950,
        });
    });

    it('calculates cumulative debt totals up to the selected month', () => {
        const transactions = [
            transaction('Взято в долг (+)', 300, '2026-01-05T12:00:00'),
            transaction('Возвращено по долгу (-)', -100, '2026-03-05T12:00:00'),
            transaction('Дано в долг (-)', -200, '2026-05-05T12:00:00'),
            transaction('Отдано по долгу (+)', 50, '2026-07-05T12:00:00'),
        ];
        const totals = calculateDebtTotalsUntilMonth(
            transactions,
            new Date(2026, 5, 1),
            (item) => item.amount,
        );

        expect(totals.get('taken')).toBe(300);
        expect(totals.get('returned')).toBe(100);
        expect(totals.get('given')).toBe(200);
        expect(totals.get('received')).toBe(0);
    });
});
