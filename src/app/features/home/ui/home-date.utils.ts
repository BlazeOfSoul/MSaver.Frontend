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

export function toIsoDateTimeLocal(value: Date): string {
    return `${toIsoDate(value)}T${`${value.getHours()}`.padStart(2, '0')}:${`${value.getMinutes()}`.padStart(2, '0')}`;
}

export function toApiDateTime(value: Date): string {
    return value.toISOString();
}

export interface ApiDateParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    hasTime: boolean;
}

const API_DATE_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export function readApiDateParts(value: string | null | undefined): ApiDateParts | null {
    const normalized = value?.trim();
    const match = normalized?.match(API_DATE_PATTERN);

    if (!normalized || !match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = match[4] === undefined ? 0 : Number(match[4]);
    const minute = match[5] === undefined ? 0 : Number(match[5]);
    const second = match[6] === undefined ? 0 : Number(match[6]);
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day ||
        date.getUTCHours() !== hour ||
        date.getUTCMinutes() !== minute ||
        date.getUTCSeconds() !== second ||
        hour > 23 ||
        minute > 59 ||
        second > 59
    ) {
        return null;
    }

    const hasTime = match[4] !== undefined;
    const hasExplicitOffset = hasTime && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);

    if (hasExplicitOffset) {
        const instant = new Date(normalized);
        if (!Number.isFinite(instant.getTime())) {
            return null;
        }

        return {
            year: instant.getFullYear(),
            month: instant.getMonth() + 1,
            day: instant.getDate(),
            hour: instant.getHours(),
            minute: instant.getMinutes(),
            second: instant.getSeconds(),
            hasTime,
        };
    }

    return { year, month, day, hour, minute, second, hasTime };
}

export function apiDateMonthKey(value: string | null | undefined): string | null {
    const parts = readApiDateParts(value);

    return parts ? apiMonthKey(parts.year, parts.month) : null;
}

export function apiDateTimestamp(value: string | null | undefined): number {
    const normalized = value?.trim();
    if (normalized && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)) {
        const timestamp = new Date(normalized).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    const parts = readApiDateParts(value);

    if (parts) {
        return new Date(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second,
        ).getTime();
    }

    const timestamp = value ? new Date(value).getTime() : Number.NaN;

    return Number.isFinite(timestamp) ? timestamp : 0;
}

export function toApiDateTimeInputValue(value: string | null | undefined): string | null {
    const parts = readApiDateParts(value);

    if (!parts) {
        return null;
    }

    return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}T${padDatePart(parts.hour)}:${padDatePart(parts.minute)}`;
}

export function toApiDate(value: string): string {
    const trimmed = value.trim();
    const isoDateTimeMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed);
    const isoDateTimeWithSecondsMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed);
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);

    if (isoDateTimeMatch) {
        return new Date(trimmed).toISOString();
    }

    if (isoDateTimeWithSecondsMatch) {
        return new Date(trimmed).toISOString();
    }

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

function padDatePart(value: number): string {
    return `${value}`.padStart(2, '0');
}
