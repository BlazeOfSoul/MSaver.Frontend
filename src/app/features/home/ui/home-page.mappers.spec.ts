import { CategoryResponse, TransactionResponse } from '../data-access/home-api.models';
import { mapCategories, mapTransaction } from './home-page.mappers';

describe('home page mappers', () => {
    it('maps transaction date-time fields for sorting and details', () => {
        const transaction = createTransaction({
            date: '2026-06-05T14:37:00',
            description: 'Lunch',
        });

        const item = mapTransaction(transaction);

        expect(item.date).toBe('05.06.2026');
        expect(item.dateTimeLabel).toContain('14:37');
        expect(item.timestamp).toBe(new Date('2026-06-05T14:37:00').getTime());
        expect(item.description).toBe('Lunch');
    });

    it('preserves category system flags for UI delete guards', () => {
        const categories: CategoryResponse[] = [
            {
                id: 'debt-given',
                name: 'Дано в долг (-)',
                type: 'Debit',
                color: '#EC4899',
                isSystem: true,
            },
        ];

        const mapped = mapCategories(categories, [], 'expense', 'BYN');

        expect(mapped).toHaveLength(1);
        expect(mapped[0].isSystem).toBe(true);
    });
});

function createTransaction(overrides: Partial<TransactionResponse> = {}): TransactionResponse {
    return {
        id: 'transaction-id',
        account: {
            id: 'account-id',
            name: 'Main',
            color: '#23c78b',
            currencyCode: 'BYN',
            isArchived: false,
        },
        category: {
            id: 'category-id',
            name: 'Food',
            type: 'Debit',
            color: '#ff6f91',
        },
        amount: -12.5,
        date: '2026-06-05',
        description: '',
        ...overrides,
    };
}
