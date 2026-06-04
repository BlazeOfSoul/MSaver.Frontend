export function startOfMonth(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function addMonths(value: Date, amount: number): Date {
    return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

export function startOfYear(value: Date): Date {
    return new Date(value.getFullYear(), 0, 1);
}

export function getYearMonths(value: Date): Date[] {
    const firstMonth = startOfYear(value);

    return Array.from({ length: 12 }, (_, index) => addMonths(firstMonth, index));
}

export function toIsoDate(value: Date): string {
    return [
        value.getFullYear(),
        `${value.getMonth() + 1}`.padStart(2, '0'),
        `${value.getDate()}`.padStart(2, '0'),
    ].join('-');
}

export function toApiDate(value: string): string {
    const trimmed = value.trim();
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);

    if (isoMatch) {
        return trimmed;
    }

    const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }

    return toIsoDate(new Date());
}

export function monthKey(value: Date): string {
    return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}`;
}

export function apiMonthKey(year: number, month: number): string {
    return `${year}-${`${month}`.padStart(2, '0')}`;
}

export function monthLabel(value: Date): string {
    return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(value);
}

export function compactMonthLabel(value: Date): string {
    return new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(value);
}
