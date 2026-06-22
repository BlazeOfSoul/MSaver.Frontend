import { type ApiDateParts, readApiDateParts } from './home-date.utils';

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
    const precision = resolveCurrencyPrecision(currencyCode);
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

    const parts = readApiDateParts(value);

    if (parts) {
        return formatApiDate(parts);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Дата не распознана';
    }

    return new Intl.DateTimeFormat('ru-RU').format(date);
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return 'Дата не указана';
    }

    const parts = readApiDateParts(value);

    if (parts) {
        return `${formatApiDate(parts)}, ${padDatePart(parts.hour)}:${padDatePart(parts.minute)}`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Дата не распознана';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
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
        case 'GBP':
            return 'Британский фунт';
        case 'CHF':
            return 'Швейцарский франк';
        case 'PLN':
            return 'Польский злотый';
        case 'CZK':
            return 'Чешская крона';
        case 'SEK':
            return 'Шведская крона';
        case 'NOK':
            return 'Норвежская крона';
        case 'DKK':
            return 'Датская крона';
        case 'CNY':
            return 'Китайский юань';
        case 'JPY':
            return 'Японская иена';
        case 'KRW':
            return 'Южнокорейская вона';
        case 'INR':
            return 'Индийская рупия';
        case 'SGD':
            return 'Сингапурский доллар';
        case 'HKD':
            return 'Гонконгский доллар';
        case 'THB':
            return 'Тайский бат';
        case 'KZT':
            return 'Казахстанский тенге';
        case 'UAH':
            return 'Украинская гривна';
        case 'GEL':
            return 'Грузинский лари';
        case 'AMD':
            return 'Армянский драм';
        case 'AZN':
            return 'Азербайджанский манат';
        case 'BRL':
            return 'Бразильский реал';
        case 'ARS':
            return 'Аргентинское песо';
        case 'CLP':
            return 'Чилийское песо';
        case 'COP':
            return 'Колумбийское песо';
        case 'PEN':
            return 'Перуанский соль';
        case 'UYU':
            return 'Уругвайское песо';
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
        case 'GBP':
            return '£';
        case 'CHF':
            return 'CHF';
        case 'PLN':
            return 'zł';
        case 'CZK':
            return 'Kč';
        case 'SEK':
        case 'NOK':
        case 'DKK':
            return 'kr';
        case 'CNY':
        case 'JPY':
            return '¥';
        case 'KRW':
            return '₩';
        case 'INR':
            return '₹';
        case 'SGD':
            return 'S$';
        case 'HKD':
            return 'HK$';
        case 'THB':
            return '฿';
        case 'KZT':
            return '₸';
        case 'UAH':
            return '₴';
        case 'GEL':
            return '₾';
        case 'AMD':
            return '֏';
        case 'AZN':
            return '₼';
        case 'BRL':
            return 'R$';
        case 'ARS':
        case 'CLP':
        case 'COP':
            return '$';
        case 'PEN':
            return 'S/';
        case 'UYU':
            return '$U';
        default:
            return currencyCode || '';
    }
}

function resolveCurrencyPrecision(currencyCode: string | null | undefined): number {
    switch (currencyCode) {
        case 'JPY':
        case 'KRW':
        case 'CLP':
            return 0;
        default:
            return 2;
    }
}

function formatApiDate(parts: ApiDateParts): string {
    return `${padDatePart(parts.day)}.${padDatePart(parts.month)}.${parts.year}`;
}

function padDatePart(value: number): string {
    return `${value}`.padStart(2, '0');
}
