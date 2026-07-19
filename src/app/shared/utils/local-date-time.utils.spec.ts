import {
    LocalDateTimeFactory,
    LocalDateTimeValue,
    resolveLocalWallClock,
} from './local-date-time.utils';

describe('local date-time utils', () => {
    it('accepts a factory result that preserves every local wall-clock part', () => {
        expect(
            resolveLocalWallClock(
                { year: 2026, month: 7, day: 18, hours: 9, minutes: 5 },
                createFactory(),
            )?.toISOString(),
        ).toBe('2026-07-18T09:05:00.000Z');
    });

    it('rejects calendar normalization without changing the process time zone', () => {
        expect(
            resolveLocalWallClock(
                { year: 2026, month: 2, day: 31, hours: 9, minutes: 5 },
                createFactory({ normalizedDay: 3 }),
            ),
        ).toBeNull();
    });

    it('rejects a simulated DST gap that normalizes the requested local hour', () => {
        expect(
            resolveLocalWallClock(
                { year: 2026, month: 3, day: 8, hours: 2, minutes: 30 },
                createFactory({ normalizedHours: 3 }),
            ),
        ).toBeNull();
    });
});

function createFactory(
    overrides: { normalizedDay?: number; normalizedHours?: number } = {},
): LocalDateTimeFactory {
    return (year, monthIndex, day, hours, minutes): LocalDateTimeValue => {
        const normalizedDay = overrides.normalizedDay ?? day;
        const normalizedHours = overrides.normalizedHours ?? hours;

        return {
            getFullYear: () => year,
            getMonth: () => monthIndex,
            getDate: () => normalizedDay,
            getHours: () => normalizedHours,
            getMinutes: () => minutes,
            toISOString: () =>
                new Date(
                    Date.UTC(year, monthIndex, normalizedDay, normalizedHours, minutes),
                ).toISOString(),
        };
    };
}
