import {
    apiDateMonthKey,
    apiDateTimestamp,
    toApiDate,
    toApiDateTimeInputValue,
} from './home-date.utils';

describe('home date utils', () => {
    it('preserves datetime-local values for transaction payloads', () => {
        expect(toApiDate('2026-06-05T14:37')).toBe('2026-06-05T14:37:00');
    });

    it('keeps existing date-only values unchanged', () => {
        expect(toApiDate('2026-06-05')).toBe('2026-06-05');
    });

    it('reads api date-times as transaction wall-clock values', () => {
        expect(toApiDateTimeInputValue('2026-06-05T14:37:00+03:00')).toBe('2026-06-05T14:37');
        expect(apiDateMonthKey('2026-06-30T23:50:00+03:00')).toBe('2026-06');
        expect(apiDateTimestamp('2026-06-05T14:37:00+03:00')).toBe(Date.UTC(2026, 5, 5, 14, 37, 0));
    });
});
