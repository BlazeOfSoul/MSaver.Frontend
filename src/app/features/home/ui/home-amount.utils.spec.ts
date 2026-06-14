import { isPositiveFiniteAmount } from './home-amount.utils';

describe('home amount utils', () => {
    it('accepts only positive finite amounts', () => {
        expect(isPositiveFiniteAmount(0.01)).toBe(true);

        [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].forEach(
            (amount) => {
                expect(isPositiveFiniteAmount(amount)).toBe(false);
            },
        );
    });
});
