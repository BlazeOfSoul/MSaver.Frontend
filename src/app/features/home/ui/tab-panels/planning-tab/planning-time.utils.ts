import {
    LocalDateTimeFactory,
    resolveLocalWallClock,
} from '../../../../../shared/utils/local-date-time.utils';

export function deviceTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function toLocalDateTimeInputValue(value: Date): string {
    const offsetMs = value.getTimezoneOffset() * 60_000;
    return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function toLocalDateInputValue(value: Date): string {
    return [
        `${value.getDate()}`.padStart(2, '0'),
        `${value.getMonth() + 1}`.padStart(2, '0'),
        value.getFullYear(),
    ].join('.');
}

export function toLocalTimeInputValue(value: Date): string {
    return `${`${value.getHours()}`.padStart(2, '0')}:${`${value.getMinutes()}`.padStart(2, '0')}`;
}

export function localDateAndTimeToUtc(dateValue: string, timeValue: string): string | null {
    const dateMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dateValue.trim());
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());
    if (!dateMatch || !timeMatch) {
        return null;
    }

    const year = Number(dateMatch[3]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[1]);
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    return (
        resolveLocalWallClock({
            year,
            month,
            day,
            hours: hour,
            minutes: minute,
        })?.toISOString() ?? null
    );
}

export function localInputToUtc(value: string, factory?: LocalDateTimeFactory): string | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hours = Number(match[4]);
    const minutes = Number(match[5]);

    return (
        resolveLocalWallClock({ year, month, day, hours, minutes }, factory)?.toISOString() ?? null
    );
}

export function csvDateToUtc(value: string): string | null {
    const normalized = value.trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    const dot = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(normalized);
    const parts = iso
        ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
        : dot
          ? { year: Number(dot[3]), month: Number(dot[2]), day: Number(dot[1]) }
          : null;

    if (!parts) {
        return null;
    }

    const localDate = new Date(parts.year, parts.month - 1, parts.day, 12);
    if (
        localDate.getFullYear() !== parts.year ||
        localDate.getMonth() !== parts.month - 1 ||
        localDate.getDate() !== parts.day
    ) {
        return null;
    }

    return localDate.toISOString();
}
