import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { HomeDataLoader, loadAllPages } from './home-data-loader';
import { HomeApiService } from './home-api.service';
import { AccountResponse, PagedResponse } from './home-api.models';

const page = (n: number): PagedResponse<number> => ({
    items: [n],
    page: n,
    size: 1,
    totalPages: 7,
    totalCount: 7,
    hasNextPage: n < 7,
    hasPreviousPage: n > 1,
});
const account = (id: string, currencyCode: string) => ({ id, currencyCode }) as AccountResponse;

describe('Home data loading', () => {
    it('limits page concurrency to four and preserves page order when responses arrive out of order', () => {
        const pending = new Map<number, Subject<PagedResponse<number>>>();
        let active = 0,
            maximum = 0,
            result: number[] = [];
        loadAllPages<number>((n) =>
            n === 1
                ? of(page(1))
                : new Observable<PagedResponse<number>>((subscriber) => {
                      active++;
                      maximum = Math.max(maximum, active);
                      const subject = new Subject<PagedResponse<number>>();
                      pending.set(n, subject);
                      const sub = subject.subscribe(subscriber);
                      return () => {
                          active--;
                          sub.unsubscribe();
                      };
                  }),
        ).subscribe((items) => (result = items));
        expect(pending.size).toBe(4);
        for (const n of [5, 4, 3, 2, 7, 6]) {
            pending.get(n)!.next(page(n));
            pending.get(n)!.complete();
        }
        expect(maximum).toBeLessThanOrEqual(4);
        expect(result).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
    it('fetches one rate per currency and exposes missing conversions instead of parity', () => {
        const api = { getTransferRate: vi.fn(() => throwError(() => new Error('offline'))) };
        TestBed.configureTestingModule({ providers: [{ provide: HomeApiService, useValue: api }] });
        const loader = TestBed.inject(HomeDataLoader);
        loader
            .exchangeRates(
                [account('main', 'BYN'), account('e1', 'EUR'), account('e2', 'EUR')],
                'BYN',
            )
            .subscribe((rates) => {
                expect(rates.get('main')).toBe(1);
                expect(rates.get('e1')).toBeNaN();
                expect(rates.get('e2')).toBeNaN();
            });
        expect(api.getTransferRate).toHaveBeenCalledOnce();
    });
    it('converts to an application currency without requiring an account in that currency', () => {
        const api = {
            getExchangeRate: vi.fn(() =>
                of({ rate: 0.25, updatedAtUtc: '2026-09-07T00:00:00Z', isStale: true }),
            ),
        };
        TestBed.configureTestingModule({ providers: [{ provide: HomeApiService, useValue: api }] });
        TestBed.inject(HomeDataLoader)
            .exchangeRates([account('byn', 'BYN')], 'EUR')
            .subscribe((rates) => {
                expect(rates.get('byn')).toBe(0.25);
                expect(rates.isStale).toBe(true);
                expect(rates.updatedAtUtc).toBe('2026-09-07T00:00:00Z');
            });
        expect(api.getExchangeRate).toHaveBeenCalledWith('BYN', 'EUR');
    });
});
