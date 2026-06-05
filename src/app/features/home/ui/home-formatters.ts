export function formatMoney(value: number, currencyCode: string): string {
    const symbol = resolveCurrencySymbol(currencyCode);
    const precision = currencyCode === 'RUB' ? 0 : 2;

    return `${new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    }).format(value)} ${symbol}`;
}

export function formatSignedMoney(value: number, currencyCode: string): string {
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';

    return `${sign}${formatMoney(Math.abs(value), currencyCode)}`;
}

export function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('ru-RU').format(date);
}

export function resolveCurrencyLabel(currencyCode: string): string {
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
            return currencyCode;
    }
}

export function resolveCurrencySymbol(currencyCode: string): string {
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
            return currencyCode;
    }
}
