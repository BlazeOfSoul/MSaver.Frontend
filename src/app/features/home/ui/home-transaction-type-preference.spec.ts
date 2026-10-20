import {
    readDefaultTransactionType,
    writeDefaultTransactionType,
} from './home-transaction-type-preference';

describe('default transaction type preference', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('persists each user preference independently and defaults to income', () => {
        expect(readDefaultTransactionType('alice')).toBe('income');
        writeDefaultTransactionType('alice', 'expense');
        expect(readDefaultTransactionType('alice')).toBe('expense');
        expect(readDefaultTransactionType('bob')).toBe('income');
        expect(readDefaultTransactionType(null)).toBe('income');
        writeDefaultTransactionType('alice', 'income');
        expect(readDefaultTransactionType('alice')).toBe('income');
    });

    it('ignores invalid preferences and tolerates blocked browser storage', () => {
        localStorage.setItem('msaver:default-transaction-type:alice', 'transfer');
        expect(readDefaultTransactionType('alice')).toBe('income');
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(readDefaultTransactionType('alice')).toBe('income');
        expect(() => writeDefaultTransactionType('alice', 'expense')).not.toThrow();
    });
});
