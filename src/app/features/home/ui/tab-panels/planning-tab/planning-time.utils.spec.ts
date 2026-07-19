import {
    csvDateToUtc,
    deviceTimeZone,
    localDateAndTimeToUtc,
    localInputToUtc,
    toLocalDateInputValue,
    toLocalDateTimeInputValue,
    toLocalTimeInputValue,
} from './planning-time.utils';
import {
    LocalDateTimeFactory,
    LocalDateTimeValue,
} from '../../../../../shared/utils/local-date-time.utils';

describe('planning time utils', () => {
    it('reports a non-empty device time zone', () => {
        expect(deviceTimeZone()).toEqual(expect.any(String));
        expect(deviceTimeZone().length).toBeGreaterThan(0);
    });

    it('formats a Date as a datetime-local value in the device time zone', () => {
        const localDate = new Date(2026, 6, 18, 9, 5);

        expect(toLocalDateTimeInputValue(localDate)).toBe('2026-07-18T09:05');
    });

    it('converts a datetime-local value to ISO without changing its local wall-clock time', () => {
        const result = localInputToUtc('2026-07-18T09:05');

        expect(result).not.toBeNull();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        const parsed = new Date(result!);
        expect([
            parsed.getFullYear(),
            parsed.getMonth() + 1,
            parsed.getDate(),
            parsed.getHours(),
            parsed.getMinutes(),
        ]).toEqual([2026, 7, 18, 9, 5]);
    });

    it('formats and parses the design-system date and time fields', () => {
        const localDate = new Date(2026, 6, 18, 9, 5);

        expect(toLocalDateInputValue(localDate)).toBe('18.07.2026');
        expect(toLocalTimeInputValue(localDate)).toBe('09:05');
        expect(localDateAndTimeToUtc('18.07.2026', '09:05')).toBe(localDate.toISOString());
    });

    it.each([
        ['31.02.2026', '09:00'],
        ['18.07.2026', '24:00'],
        ['2026-07-18', '09:00'],
        ['18.07.2026', '9:00'],
    ])('rejects invalid display date/time %s %s', (date, time) => {
        expect(localDateAndTimeToUtc(date, time)).toBeNull();
    });

    it('returns null for an invalid datetime-local value', () => {
        expect(localInputToUtc('not-a-date')).toBeNull();
        expect(localInputToUtc('2026-02-31T09:00')).toBeNull();
        expect(localInputToUtc('2026-07-18T24:00')).toBeNull();
        expect(localInputToUtc('2026-07-18T9:00')).toBeNull();
    });

    it('rejects a nonexistent local wall-clock time instead of normalizing across a DST gap', () => {
        const springForwardFactory: LocalDateTimeFactory = (
            year,
            monthIndex,
            day,
            hours,
            minutes,
        ): LocalDateTimeValue => {
            const normalizedHours = hours === 2 ? 3 : hours;

            return {
                getFullYear: () => year,
                getMonth: () => monthIndex,
                getDate: () => day,
                getHours: () => normalizedHours,
                getMinutes: () => minutes,
                toISOString: () =>
                    new Date(
                        Date.UTC(year, monthIndex, day, normalizedHours, minutes),
                    ).toISOString(),
            };
        };

        expect(localInputToUtc('2026-03-08T02:30', springForwardFactory)).toBeNull();
        expect(localInputToUtc('2026-03-08T03:30', springForwardFactory)).toBe(
            '2026-03-08T03:30:00.000Z',
        );
    });

    it.each([
        ['2026-07-18', [2026, 7, 18]],
        ['18.07.2026', [2026, 7, 18]],
        ['29.02.2028', [2028, 2, 29]],
    ])('parses CSV date %s as local noon', (source, expectedDateParts) => {
        const result = csvDateToUtc(source);

        expect(result).not.toBeNull();
        const parsed = new Date(result!);
        expect([
            parsed.getFullYear(),
            parsed.getMonth() + 1,
            parsed.getDate(),
            parsed.getHours(),
        ]).toEqual([...expectedDateParts, 12]);
    });

    it.each(['2026-02-29', '2026-04-31', '31.04.2026', '18/07/2026', '', 'not-a-date'])(
        'rejects invalid or unsupported CSV date %j',
        (source) => {
            expect(csvDateToUtc(source)).toBeNull();
        },
    );
});
