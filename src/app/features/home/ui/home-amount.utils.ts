import { resolveCurrencyPrecision } from './home-formatters';

export function isPositiveFiniteAmount(amount: number): boolean {
    return Number.isFinite(amount) && amount > 0;
}

export function parseInitialAccountBalance(text: string, currencyCode: string) {
    const value = text.trim();
    if (!value) return { amount: 0, error: '' };

    const decimal = /^(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[.,](\d+))?$|^[.,](\d+)$/.exec(
        value,
    );
    if (!decimal) return { amount: 0, error: 'Введите число не меньше нуля.' };

    const precision = resolveCurrencyPrecision(currencyCode);
    const fraction = (decimal[1] ?? decimal[2] ?? '').replace(/0+$/, '');
    if (fraction.length > precision) {
        return {
            amount: 0,
            error:
                precision === 0
                    ? 'В этой валюте введите целое число.'
                    : 'Введите не более двух знаков после запятой.',
        };
    }

    const amount = Number(value.replace(/[ \u00a0\u202f]/g, '').replace(',', '.'));
    return Number.isSafeInteger(Math.round(amount * 10 ** precision))
        ? { amount, error: '' }
        : { amount: 0, error: 'Сумма слишком большая.' };
}
