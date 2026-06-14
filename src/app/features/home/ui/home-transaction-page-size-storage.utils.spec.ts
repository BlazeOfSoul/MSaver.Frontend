import {
    DEFAULT_TRANSACTION_PAGE_SIZE,
    TRANSACTION_PAGE_SIZE_STORAGE_KEY,
    normalizeTransactionPageSize,
    readStoredTransactionPageSize,
    writeStoredTransactionPageSize,
} from './home-transaction-page-size-storage.utils';

describe('home transaction page size storage utils', () => {
    it('normalizes transaction page sizes to supported options', () => {
        expect(normalizeTransactionPageSize(10)).toBe(10);
        expect(normalizeTransactionPageSize(25)).toBe(25);
        expect(normalizeTransactionPageSize(50)).toBe(50);
        expect(normalizeTransactionPageSize(100)).toBe(100);

        [0, 1, 75, Number.NaN, Number.POSITIVE_INFINITY].forEach((size) => {
            expect(normalizeTransactionPageSize(size)).toBe(DEFAULT_TRANSACTION_PAGE_SIZE);
        });
    });

    it('reads a stored transaction page size safely', () => {
        const storage = {
            getItem: vi.fn(() => '50'),
            setItem: vi.fn(),
        };

        expect(readStoredTransactionPageSize(storage)).toBe(50);
        expect(storage.getItem).toHaveBeenCalledWith(TRANSACTION_PAGE_SIZE_STORAGE_KEY);
    });

    it('falls back to the default when storage is missing, invalid, or blocked', () => {
        const invalidStorage = {
            getItem: vi.fn(() => '500'),
            setItem: vi.fn(),
        };
        const blockedStorage = {
            getItem: vi.fn(() => {
                throw new Error('blocked');
            }),
            setItem: vi.fn(),
        };

        expect(readStoredTransactionPageSize(null)).toBe(DEFAULT_TRANSACTION_PAGE_SIZE);
        expect(readStoredTransactionPageSize(invalidStorage)).toBe(DEFAULT_TRANSACTION_PAGE_SIZE);
        expect(readStoredTransactionPageSize(blockedStorage)).toBe(DEFAULT_TRANSACTION_PAGE_SIZE);
    });

    it('writes only normalized transaction page sizes safely', () => {
        const storage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
        };

        writeStoredTransactionPageSize(75, storage);
        writeStoredTransactionPageSize(100, storage);

        expect(storage.setItem).toHaveBeenNthCalledWith(
            1,
            TRANSACTION_PAGE_SIZE_STORAGE_KEY,
            DEFAULT_TRANSACTION_PAGE_SIZE.toString(),
        );
        expect(storage.setItem).toHaveBeenNthCalledWith(
            2,
            TRANSACTION_PAGE_SIZE_STORAGE_KEY,
            '100',
        );
    });
});
