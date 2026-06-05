import { formatDate, formatMoney, resolveCurrencyLabel, safeText } from './home-formatters';

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
});
