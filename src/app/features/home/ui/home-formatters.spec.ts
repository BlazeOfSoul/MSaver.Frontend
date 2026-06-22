import {
    formatDate,
    formatDateTime,
    formatMoney,
    resolveCurrencyLabel,
    safeText,
} from './home-formatters';

describe('home formatters', () => {
    it('returns friendly placeholders for missing money, dates and text', () => {
        expect(formatMoney(null, 'BYN')).toBe('Нет суммы');
        expect(formatDate(null)).toBe('Дата не указана');
        expect(safeText(null, 'Без названия')).toBe('Без названия');
    });

    it('does not leak missing currency codes into the UI', () => {
        expect(resolveCurrencyLabel(null)).toBe('Валюта не указана');
        expect(formatMoney(10, null)).toBe('10,00');
    });

    it('supports the expanded currency set with currency-specific precision', () => {
        expect(resolveCurrencyLabel('JPY')).toBe('Японская иена');
        expect(resolveCurrencyLabel('BRL')).toBe('Бразильский реал');
        expect(formatMoney(1200, 'JPY')).toBe('1 200 ¥');
        expect(formatMoney(1200, 'KZT')).toBe('1 200,00 ₸');
    });

    it('formats date-time values without dropping the time', () => {
        expect(formatDateTime('2026-06-05T14:37:00')).toContain('14:37');
        expect(formatDateTime('2026-06-05T14:37:00+03:00')).toContain('14:37');
        expect(formatDateTime(null)).toBe('Дата не указана');
    });
});
