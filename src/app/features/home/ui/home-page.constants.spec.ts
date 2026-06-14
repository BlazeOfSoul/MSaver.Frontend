import { MS_ACCOUNT_COLORS, MS_CATEGORY_COLORS } from '../../../shared/theme/theme-colors';
import { ACCOUNT_COLORS, CATEGORY_COLORS, CURRENCY_OPTIONS } from './home-page.constants';

describe('home-page constants', () => {
    it('reuses the shared account fallback palette', () => {
        expect(ACCOUNT_COLORS).toBe(MS_ACCOUNT_COLORS);
    });

    it('reuses the shared category fallback palette', () => {
        expect(CATEGORY_COLORS).toBe(MS_CATEGORY_COLORS);
    });

    it('keeps currency dropdown options sorted alphabetically by code', () => {
        const values = CURRENCY_OPTIONS.map((option) => option.value);

        expect(values).toEqual([...values].sort((left, right) => left.localeCompare(right, 'en')));
    });
});
