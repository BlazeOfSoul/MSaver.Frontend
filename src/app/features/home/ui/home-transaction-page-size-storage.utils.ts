export const TRANSACTION_PAGE_SIZE_STORAGE_KEY = 'msaver:overview-transaction-count';
export const TRANSACTION_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_TRANSACTION_PAGE_SIZE = 25;

export type TransactionPageSize = (typeof TRANSACTION_PAGE_SIZE_OPTIONS)[number];

interface TransactionPageSizeStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

function getBrowserTransactionPageSizeStorage(): TransactionPageSizeStorage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

export function normalizeTransactionPageSize(size: number): TransactionPageSize {
    return TRANSACTION_PAGE_SIZE_OPTIONS.includes(size as TransactionPageSize)
        ? (size as TransactionPageSize)
        : DEFAULT_TRANSACTION_PAGE_SIZE;
}

export function readStoredTransactionPageSize(
    storage: TransactionPageSizeStorage | null = getBrowserTransactionPageSizeStorage(),
): TransactionPageSize {
    try {
        return normalizeTransactionPageSize(
            Number(storage?.getItem(TRANSACTION_PAGE_SIZE_STORAGE_KEY)),
        );
    } catch {
        return DEFAULT_TRANSACTION_PAGE_SIZE;
    }
}

export function writeStoredTransactionPageSize(
    size: number,
    storage: TransactionPageSizeStorage | null = getBrowserTransactionPageSizeStorage(),
): void {
    try {
        storage?.setItem(
            TRANSACTION_PAGE_SIZE_STORAGE_KEY,
            normalizeTransactionPageSize(size).toString(),
        );
    } catch {
        return;
    }
}
