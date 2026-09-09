import { environment } from '../../../environments/environment';
import { currentOrigin, isApiRequestUrl } from './api-url.utils';

describe('isApiRequestUrl', () => {
    const originalApiUrl = environment.apiUrl;

    afterEach(() => {
        environment.apiUrl = originalApiUrl;
    });

    it('accepts only the configured API origin and path boundary', () => {
        environment.apiUrl = '/api';

        expect(isApiRequestUrl('/api')).toBe(true);
        expect(isApiRequestUrl('/api/Accounts?page=1')).toBe(true);
        expect(isApiRequestUrl(`${currentOrigin()}/api/Accounts`)).toBe(true);
        expect(isApiRequestUrl('/api-other/Accounts')).toBe(false);
        expect(isApiRequestUrl('/assets/api/Accounts')).toBe(false);
    });

    it.each([
        'https://external.example/api/Accounts',
        '//external.example/api/Accounts',
        '\\\\external.example/api/Accounts',
        '/\\external.example/api/Accounts',
        'https://external.example/api/Accounts?next=/api',
    ])('rejects another origin regardless of URL notation: %s', (url) => {
        environment.apiUrl = '/api';

        expect(isApiRequestUrl(url)).toBe(false);
    });

    it('supports an explicitly configured external API without trusting other hosts', () => {
        environment.apiUrl = 'https://api.example/v1/';

        expect(isApiRequestUrl('https://api.example/v1/Accounts')).toBe(true);
        expect(isApiRequestUrl('https://api.example/v10/Accounts')).toBe(false);
        expect(isApiRequestUrl('https://other.example/v1/Accounts')).toBe(false);
        expect(isApiRequestUrl('/v1/Accounts')).toBe(false);
    });
});
