import {
    moveAccountIds,
    readStoredAccountSortMode,
    sortAccountsForDisplay,
    writeStoredAccountSortMode,
} from './home-account-order.utils';

describe('account ordering', () => {
    const accounts = [
        { name: 'Основной счёт', isPrimary: true, sortOrder: null },
        { name: 'Дома', isPrimary: false, sortOrder: 1 },
        { name: 'Банк', isPrimary: false, sortOrder: 0 },
        { name: 'Новый', isPrimary: false, sortOrder: null },
    ];

    it('uses persisted priority, then appends accounts without a priority without mutating the source', () => {
        expect(sortAccountsForDisplay(accounts, 'priority').map((x) => x.name)).toEqual([
            'Банк',
            'Дома',
            'Основной счёт',
            'Новый',
        ]);
        expect(accounts[0].name).toBe('Основной счёт');
    });

    it('applies alphabetical mode to every account including the primary one', () => {
        expect(sortAccountsForDisplay(accounts, 'alphabetical').map((x) => x.name)).toEqual([
            'Банк',
            'Дома',
            'Новый',
            'Основной счёт',
        ]);
    });

    it('preserves the previous default on older responses without sortOrder or isPrimary', () => {
        expect(
            sortAccountsForDisplay([{ name: 'Банк' }, { name: 'Основной счёт' }], 'priority')[0]
                .name,
        ).toBe('Основной счёт');
    });

    it('moves only the selected account and keeps other relative positions', () => {
        expect(moveAccountIds(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
        expect(moveAccountIds(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    });

    it('persists the display preference independently from category sorting', () => {
        writeStoredAccountSortMode('alphabetical');
        expect(readStoredAccountSortMode()).toBe('alphabetical');
        writeStoredAccountSortMode('priority');
    });
});
