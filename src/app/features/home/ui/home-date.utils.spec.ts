import {
    apiDateMonthKey,
    apiDateTimestamp,
    toApiDateTime,
    toApiDate,
    toApiDateTimeInputValue,
    monthKey,
    toIsoDateTimeLocal,
} from './home-date.utils';

describe('home date utils', () => {
    it('converts datetime-local values to UTC transaction payloads', () => {
        expect(toApiDate('2026-06-05T14:37')).toBe(new Date('2026-06-05T14:37').toISOString());
    });

    it('keeps existing date-only values unchanged', () => {
        expect(toApiDate('2026-06-05')).toBe('2026-06-05');
    });

    it('formats API boundary date-times as UTC ISO-8601', () => {
        const value = new Date(2026, 7, 1, 0, 0, 0);

        expect(toApiDateTime(value)).toBe(value.toISOString());
    });

    it('converts offset API timestamps to the device local time', () => {
        const value = '2026-06-05T14:37:00+03:00';
        const instant = new Date(value);

        expect(toApiDateTimeInputValue(value)).toBe(toIsoDateTimeLocal(instant));
        expect(apiDateMonthKey(value)).toBe(monthKey(instant));
        expect(apiDateTimestamp(value)).toBe(instant.getTime());
    });
});
