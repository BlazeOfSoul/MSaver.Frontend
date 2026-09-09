import { MS_ACCOUNT_COLORS } from '../../../shared/theme/theme-colors';
import { nextAccountColor } from './home-account-colors';

describe('New account color', () => {
    it('chooses an unused color despite duplicate colors or removed accounts', () => {
        expect(
            nextAccountColor([
                MS_ACCOUNT_COLORS[0].toUpperCase(),
                MS_ACCOUNT_COLORS[0],
                MS_ACCOUNT_COLORS[2],
            ]),
        ).toBe(MS_ACCOUNT_COLORS[1]);
    });
    it('reuses the least common color only after the palette has been used', () => {
        expect(nextAccountColor([...MS_ACCOUNT_COLORS, MS_ACCOUNT_COLORS[0]])).toBe(
            MS_ACCOUNT_COLORS[1],
        );
    });
});
