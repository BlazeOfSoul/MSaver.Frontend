import {
    calculateTransferReceiveAmount,
    canSubmitAccountTransfer,
    formatTransferMoneyAmount,
    normalizeTransferMoneyInputText,
    parseTransferMoneyAmount,
    parseTransferRateInput,
    toTransferDraftRate,
} from './account-transfer-panel.helpers';

describe('account transfer panel helpers', () => {
    const draft = {
        fromAccountId: 'source',
        toAccountId: 'target',
        amount: 100,
        rate: null,
        description: '',
    };

    it('normalizes typed money amounts without preserving invalid or negative values', () => {
        expect(parseTransferMoneyAmount(' 12,345 ')).toBe(12.35);
        expect(parseTransferMoneyAmount('-5')).toBe(0);
        expect(parseTransferMoneyAmount('not-a-number')).toBe(0);
        expect(formatTransferMoneyAmount(12.3)).toBe('12.30');
        expect(formatTransferMoneyAmount(-12.3)).toBe('0.00');
    });

    it('removes the initial zero mask only while editing a zero amount', () => {
        expect(normalizeTransferMoneyInputText('0.0012,5', true, 0)).toBe('12,5');
        expect(normalizeTransferMoneyInputText('0.0012,5', false, 0)).toBe('0.0012,5');
        expect(normalizeTransferMoneyInputText('0.0012,5', true, 10)).toBe('0.0012,5');
    });

    it('rounds visible rates and converts inverted display values back to stored rates', () => {
        expect(parseTransferRateInput('2,6789')).toBe(2.679);
        expect(toTransferDraftRate('2.5', true)).toBe(0.4);
        expect(toTransferDraftRate('2.5', false)).toBe(2.5);
        expect(toTransferDraftRate('0', false)).toBeNull();
    });

    it('calculates received transfer money from a positive receive rate', () => {
        expect(calculateTransferReceiveAmount(100, 0.37)).toBe(37);
        expect(calculateTransferReceiveAmount(10, 0)).toBe(0);
        expect(calculateTransferReceiveAmount(-10, 1)).toBe(0);
    });

    it('allows submit only when account, amount, rate and saving rules are satisfied', () => {
        expect(
            canSubmitAccountTransfer({
                accountOptionCount: 2,
                draft,
                usesDifferentCurrencies: false,
                rateLoading: false,
                saving: false,
            }),
        ).toBe(true);

        expect(
            canSubmitAccountTransfer({
                accountOptionCount: 2,
                draft: { ...draft, rate: null },
                usesDifferentCurrencies: true,
                rateLoading: false,
                saving: false,
            }),
        ).toBe(false);

        expect(
            canSubmitAccountTransfer({
                accountOptionCount: 2,
                draft: { ...draft, fromAccountId: 'source', toAccountId: 'source' },
                usesDifferentCurrencies: false,
                rateLoading: false,
                saving: false,
            }),
        ).toBe(false);
    });
});
