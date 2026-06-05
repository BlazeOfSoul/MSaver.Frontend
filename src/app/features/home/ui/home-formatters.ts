export function safeText(value: string | null | undefined, fallback: string): string {
    const text = value?.trim();

    return text ? text : fallback;
}

export function formatMoney(
    value: number | null | undefined,
    currencyCode: string | null | undefined,
): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 'Нет суммы';
    }

    const symbol = resolveCurrencySymbol(currencyCode);
    const precision = currencyCode === 'RUB' ? 0 : 2;
    const amount = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    }).format(value);

    return symbol ? `${amount} ${symbol}` : amount;
}

export function formatSignedMoney(
    value: number | null | undefined,
    currencyCode: string | null | undefined,
): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 'Нет суммы';
    }

    const sign = value > 0 ? '+' : value < 0 ? '-' : '';

    return `${sign}${formatMoney(Math.abs(value), currencyCode)}`;
}

export function formatDate(value: string | null | undefined): string {
    if (!value) {
        return 'Дата не указана';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Дата не распознана';
    }

    return new Intl.DateTimeFormat('ru-RU').format(date);
}

export function resolveCurrencyLabel(currencyCode: string | null | undefined): string {
    switch (currencyCode) {
        case 'BYN':
            return 'Белорусский рубль';
        case 'USD':
            return 'Доллар США';
        case 'EUR':
            return 'Евро';
        case 'RUB':
            return 'Российский рубль';
        default:
            return currencyCode || 'Валюта не указана';
    }
}

export function resolveCurrencySymbol(currencyCode: string | null | undefined): string {
    switch (currencyCode) {
        case 'BYN':
            return 'Br';
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        case 'RUB':
            return '₽';
        default:
            return currencyCode || '';
    }
}
