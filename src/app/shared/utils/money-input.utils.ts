const MONEY_INPUT_FRACTION_DIGITS = 2;
const MONEY_INPUT_ZERO_MASK = '0.00';

export function formatMoneyInputAmount(value: number): string {
    return Number.isFinite(value) && value > 0
        ? value.toFixed(MONEY_INPUT_FRACTION_DIGITS)
        : MONEY_INPUT_ZERO_MASK;
}

export function parseMoneyInputAmount(value: string | number): number {
    const normalized = normalizeNumericInput(value);
    const parsed = Number.parseFloat(normalized);

    return roundMoneyInputAmount(parsed);
}

export function roundMoneyInputAmount(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    const multiplier = 10 ** MONEY_INPUT_FRACTION_DIGITS;

    return Math.round(value * multiplier) / multiplier;
}

export function normalizeMoneyInputText(
    value: string,
    isEditing: boolean,
    currentAmount: number,
): string {
    if (isEditing && currentAmount <= 0 && value.startsWith(MONEY_INPUT_ZERO_MASK)) {
        return value.slice(MONEY_INPUT_ZERO_MASK.length);
    }

    return value;
}

export function appendMoneyInputCurrency(value: string, currencyCode: string): string {
    return currencyCode ? `${value} ${currencyCode}` : value;
}

function normalizeNumericInput(value: string | number): string {
    return `${value ?? ''}`.replace(',', '.').replace(/\s/g, '').trim();
}
