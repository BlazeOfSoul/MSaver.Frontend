import { TransactionDraft } from './home-page.models';

export type TransactionType = TransactionDraft['type'];

function storageKey(userId: string): string {
    return `msaver:default-transaction-type:${userId}`;
}

export function readDefaultTransactionType(userId: string | null): TransactionType {
    try {
        return userId && globalThis.localStorage?.getItem(storageKey(userId)) === 'expense'
            ? 'expense'
            : 'income';
    } catch {
        return 'income';
    }
}

export function writeDefaultTransactionType(userId: string | null, type: TransactionType): void {
    try {
        if (userId) globalThis.localStorage?.setItem(storageKey(userId), type);
    } catch {
        // Keep the preference in memory when browser storage is unavailable.
    }
}
