import { AccountResponse } from '../data-access/home-api.models';

export type AccountSortMode = 'priority' | 'alphabetical';
export const ACCOUNT_SORT_MODE_STORAGE_KEY = 'msaver:account-sort-mode';

export function readStoredAccountSortMode(): AccountSortMode {
    try {
        return globalThis.localStorage?.getItem(ACCOUNT_SORT_MODE_STORAGE_KEY) === 'alphabetical'
            ? 'alphabetical'
            : 'priority';
    } catch {
        return 'priority';
    }
}

export function writeStoredAccountSortMode(mode: AccountSortMode): void {
    try {
        globalThis.localStorage?.setItem(ACCOUNT_SORT_MODE_STORAGE_KEY, mode);
    } catch {
        /* Storage can be disabled. */
    }
}

export function sortAccountsForDisplay<
    T extends Pick<AccountResponse, 'name' | 'sortOrder' | 'isPrimary'>,
>(accounts: ReadonlyArray<T>, mode: AccountSortMode): T[] {
    return [...accounts].sort((left, right) => {
        if (mode === 'priority') {
            const difference =
                (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
                (right.sortOrder ?? Number.MAX_SAFE_INTEGER);
            if (difference) return difference;
            const primary = (account: T) =>
                account.isPrimary === true ||
                (account.isPrimary === undefined &&
                    account.name.trim().toLowerCase() === 'основной счёт');
            if (primary(left) !== primary(right)) return primary(left) ? -1 : 1;
        }
        return left.name.localeCompare(right.name, 'ru');
    });
}

export function moveAccountIds(ids: ReadonlyArray<string>, from: number, to: number): string[] {
    const result = [...ids];
    if (from < 0 || to < 0 || from >= ids.length || to >= ids.length || from === to) return result;
    result.splice(to, 0, result.splice(from, 1)[0]);
    return result;
}
