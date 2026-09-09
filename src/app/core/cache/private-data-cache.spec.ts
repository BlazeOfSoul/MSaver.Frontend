import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../features/auth/data-access/auth.store';
import {
    PrivateDataCache,
    clearPrivateDataCache,
    privateCacheGeneration,
} from './private-data-cache';

describe('PrivateDataCache', () => {
    let cache: PrivateDataCache;
    beforeEach(() => {
        localStorage.clear();
        cache = new PrivateDataCache();
    });
    it('isolates users and filter queries', () => {
        cache.write('alice', 'September/all', { amount: 70 });
        expect(cache.read('alice', 'September/all')?.value).toEqual({ amount: 70 });
        expect(cache.read('bob', 'September/all')).toBeNull();
        expect(cache.read('alice', 'October/all')).toBeNull();
        expect(cache.read(null, 'September/all')).toBeNull();
    });
    it('expires after twelve hours and rejects future timestamps', () => {
        vi.useFakeTimers();
        cache.write('alice', 'query', 42);
        vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1);
        expect(cache.read('alice', 'query')).toBeNull();
        cache.write('alice', 'query', 42);
        vi.setSystemTime(Date.now() - 1000);
        expect(cache.read('alice', 'query')).toBeNull();
        vi.useRealTimers();
    });
    it('preserves missing rates and freshness metadata without converting missing rates to zero', () => {
        const rates = Object.assign(
            new Map([
                ['BYN', 1],
                ['EUR', NaN],
            ]),
            { isStale: true, updatedAtUtc: '2026-09-08T00:00:00Z' },
        );
        cache.write('alice', 'query', rates);
        const result = cache.read<typeof rates>('alice', 'query')!.value;
        expect(result.get('BYN')).toBe(1);
        expect(result.get('EUR')).toBeNaN();
        expect(result.isStale).toBe(true);
    });
    it('clears private data on logout and keeps same-user refreshes', () => {
        const auth = TestBed.inject(AuthStore);
        cache.write('alice', 'query', 42);
        auth.setSession({
            id: 'alice',
            clientId: 'session',
            email: 'alice@example.test',
            name: 'Alice',
        });
        expect(cache.read('alice', 'query')?.value).toBe(42);
        auth.clearSession();
        expect(cache.read('alice', 'query')).toBeNull();
    });
    it('clears old-user data when the authenticated user changes', () => {
        cache.write('alice', 'query', 42);
        clearPrivateDataCache('bob');
        expect(cache.read('alice', 'query')).toBeNull();
    });
    it('bounds storage and tracks invalidation for pending requests', () => {
        const before = privateCacheGeneration();
        clearPrivateDataCache();
        expect(privateCacheGeneration()).toBeGreaterThan(before);
        cache.write('alice', 'query', 'x'.repeat(2_000_001));
        expect(cache.read('alice', 'query')).toBeNull();
        localStorage.setItem('msaver.private-cache.v1', '{');
        expect(cache.read('alice', 'query')).toBeNull();
    });
});
