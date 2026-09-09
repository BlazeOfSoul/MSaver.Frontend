import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { privateCacheInterceptor } from './private-cache.interceptor';
import { PrivateDataCache, privateCacheGeneration } from './private-data-cache';

describe('Private cache mutation invalidation', () => {
    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([privateCacheInterceptor])),
                provideHttpClientTesting(),
            ],
        });
    });
    afterEach(() => TestBed.inject(HttpTestingController).verify());
    it('keeps cache during reads and invalidates on both sides of a data write', () => {
        const cache = TestBed.inject(PrivateDataCache),
            http = TestBed.inject(HttpClient),
            requests = TestBed.inject(HttpTestingController);
        cache.write('alice', 'all', 42);
        http.get('/api/Accounts').subscribe();
        requests.expectOne('/api/Accounts').flush([]);
        expect(cache.read('alice', 'all')?.value).toBe(42);
        const before = privateCacheGeneration();
        http.post('/api/Transactions', { amount: -5 }).subscribe();
        expect(cache.read('alice', 'all')).toBeNull();
        expect(privateCacheGeneration()).toBeGreaterThan(before);
        const during = privateCacheGeneration();
        requests.expectOne('/api/Transactions').flush({});
        expect(privateCacheGeneration()).toBeGreaterThan(during);
    });
    it('does not invalidate finance data for routine authentication refresh', () => {
        const cache = TestBed.inject(PrivateDataCache);
        cache.write('alice', 'all', 42);
        TestBed.inject(HttpClient).post('/api/Auth/refresh', {}).subscribe();
        TestBed.inject(HttpTestingController).expectOne('/api/Auth/refresh').flush({});
        expect(cache.read('alice', 'all')?.value).toBe(42);
    });
});
