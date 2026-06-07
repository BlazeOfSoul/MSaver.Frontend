import { CURRENCY_OPTIONS } from './home-page.constants';

describe('home-page constants', () => {
    it('keeps currency dropdown options sorted alphabetically by code', () => {
        const values = CURRENCY_OPTIONS.map((option) => option.value);

        expect(values).toEqual([...values].sort((left, right) => left.localeCompare(right, 'en')));
    });
});
