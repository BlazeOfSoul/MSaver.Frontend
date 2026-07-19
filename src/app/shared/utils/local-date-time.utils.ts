export interface LocalWallClockParts {
    year: number;
    month: number;
    day: number;
    hours: number;
    minutes: number;
}

export interface LocalDateTimeValue {
    getFullYear(): number;
    getMonth(): number;
    getDate(): number;
    getHours(): number;
    getMinutes(): number;
    toISOString(): string;
}

export type LocalDateTimeFactory = (
    year: number,
    monthIndex: number,
    day: number,
    hours: number,
    minutes: number,
) => LocalDateTimeValue;

const systemLocalDateTimeFactory: LocalDateTimeFactory = (year, monthIndex, day, hours, minutes) =>
    new Date(year, monthIndex, day, hours, minutes);

export function resolveLocalWallClock(
    parts: LocalWallClockParts,
    factory: LocalDateTimeFactory = systemLocalDateTimeFactory,
): LocalDateTimeValue | null {
    const value = factory(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes);

    return value.getFullYear() === parts.year &&
        value.getMonth() === parts.month - 1 &&
        value.getDate() === parts.day &&
        value.getHours() === parts.hours &&
        value.getMinutes() === parts.minutes
        ? value
        : null;
}
