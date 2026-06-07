import { toApiDate } from './home-date.utils';

describe('home date utils', () => {
    it('preserves datetime-local values for transaction payloads', () => {
        expect(toApiDate('2026-06-05T14:37')).toBe('2026-06-05T14:37:00');
    });

    it('keeps existing date-only values unchanged', () => {
        expect(toApiDate('2026-06-05')).toBe('2026-06-05');
    });
});
