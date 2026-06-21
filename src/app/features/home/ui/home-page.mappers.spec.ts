import {
    AccountResponse,
    CategoryResponse,
    TransactionResponse,
} from '../data-access/home-api.models';
import { ACCOUNT_COLORS, CATEGORY_COLORS } from './home-page.constants';
import { mapAccount, mapCategories, mapTags, mapTransaction } from './home-page.mappers';

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

    it('falls back from unsafe account colors returned by the backend', () => {
        const mapped = mapAccount(createAccount({ color: 'url(https://example.test/tracker)' }), 1);

        expect(mapped.color).toBe(ACCOUNT_COLORS[1]);
    });

    it('falls back from unsafe transaction category colors returned by the backend', () => {
        const item = mapTransaction(
            createTransaction({
                category: {
                    id: 'category-id',
                    name: 'Food',
                    type: 'Debit',
                    color: 'var(--danger)',
                },
            }),
        );

        expect(item.categoryColor).toBe(CATEGORY_COLORS[0]);
    });

    it('maps negative transaction amounts as expenses even when category type is missing', () => {
        const item = mapTransaction(
            createTransaction({
                amount: -42,
                category: {
                    id: 'category-id',
                    name: 'Food',
                    type: undefined as unknown as TransactionResponse['category']['type'],
                    color: '#ff6f91',
                },
            }),
        );

        expect(item.tone).toBe('expense');
        expect(item.amountLabel).toContain('-');
    });

    it('falls back from unsafe category and tag colors returned by the backend', () => {
        const categories = mapCategories(
            [
                {
                    id: 'category-id',
                    name: 'Food',
                    type: 'Debit',
                    color: 'expression(alert(1))',
                },
            ],
            [],
            'expense',
            'BYN',
        );
        const tags = mapTags([
            {
                id: 'tag-id',
                name: 'Essentials',
                color: 'linear-gradient(red, blue)',
                isDeleted: false,
                categories: [
                    {
                        id: 'nested-category-id',
                        name: 'Nested',
                        type: 'Debit',
                        color: 'url(javascript:alert(1))',
                        isDeleted: false,
                    },
                ],
            },
        ]);

        expect(categories[0].color).toBe(CATEGORY_COLORS[0]);
        expect(tags[0].color).toBe(CATEGORY_COLORS[0]);
        expect(tags[0].categories[0].color).toBe(CATEGORY_COLORS[0]);
    });

    it('hides deleted tag groups returned by the backend', () => {
        const tags = mapTags([
            {
                id: 'deleted-tag-id',
                name: 'Deleted',
                color: '#23c78b',
                isDeleted: true,
                categories: [],
            },
            {
                id: 'active-tag-id',
                name: 'Active',
                color: '#67a6c1',
                isDeleted: false,
                categories: [],
            },
        ]);

        expect(tags.map((tag) => tag.id)).toEqual(['active-tag-id']);
    });
});

function createAccount(overrides: Partial<AccountResponse> = {}): AccountResponse {
    return {
        id: 'account-id',
        name: 'Main',
        color: '#23c78b',
        currencyCode: 'BYN',
        currentBalance: 0,
        isArchived: false,
        ...overrides,
    };
}

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
