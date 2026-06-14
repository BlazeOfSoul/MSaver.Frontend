import {
    appendMoneyInputCurrency,
    formatMoneyInputAmount,
    normalizeMoneyInputText,
    parseMoneyInputAmount,
    roundMoneyInputAmount,
} from './money-input.utils';

describe('money input utils', () => {
    it('formats only positive finite values with two decimal places', () => {
        expect(formatMoneyInputAmount(12)).toBe('12.00');
        expect(formatMoneyInputAmount(12.3)).toBe('12.30');
        expect(formatMoneyInputAmount(0)).toBe('0.00');
        expect(formatMoneyInputAmount(-10)).toBe('0.00');
        expect(formatMoneyInputAmount(Number.NaN)).toBe('0.00');
    });

    it('parses decimal input with comma, spaces and money rounding', () => {
        expect(parseMoneyInputAmount(' 12,345 ')).toBe(12.35);
        expect(parseMoneyInputAmount('1 234.567')).toBe(1234.57);
        expect(parseMoneyInputAmount('-5')).toBe(0);
        expect(parseMoneyInputAmount('not-a-number')).toBe(0);
    });

    it('removes the zero mask only while editing an empty amount', () => {
        expect(normalizeMoneyInputText('0.0012,5', true, 0)).toBe('12,5');
        expect(normalizeMoneyInputText('0.0012,5', false, 0)).toBe('0.0012,5');
        expect(normalizeMoneyInputText('0.0012,5', true, 10)).toBe('0.0012,5');
    });

    it('rounds finite values to money precision and rejects invalid values', () => {
        expect(roundMoneyInputAmount(10.235)).toBe(10.24);
        expect(roundMoneyInputAmount(0)).toBe(0);
        expect(roundMoneyInputAmount(Number.POSITIVE_INFINITY)).toBe(0);
    });

    it('appends a currency code only when one is available', () => {
        expect(appendMoneyInputCurrency('12.00', 'USD')).toBe('12.00 USD');
        expect(appendMoneyInputCurrency('12.00', '')).toBe('12.00');
    });
});
