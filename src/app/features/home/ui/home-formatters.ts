export function formatMoney(value: number, currencyCode: string): string {
    const symbol = resolveCurrencySymbol(currencyCode);

    return `${new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: currencyCode === 'RUB' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'RUB' ? 0 : 2,
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
    return currencyCode === 'BYN' ? 'Белорусский рубль' : currencyCode;
}

export function resolveCurrencySymbol(currencyCode: string): string {
    return currencyCode === 'BYN' ? 'Br' : currencyCode;
}
