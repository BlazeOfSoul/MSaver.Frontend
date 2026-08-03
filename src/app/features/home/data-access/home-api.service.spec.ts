import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { HomeApiService } from './home-api.service';

describe('HomeApiService', () => {
    let service: HomeApiService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), HomeApiService],
        });

        service = TestBed.inject(HomeApiService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('loads the saved category order for the current user', () => {
        service.getCategoryOrder().subscribe((response) => {
            expect(response.categoryIds).toEqual(['rent-id', 'food-id']);
        });

        const request = httpMock.expectOne(`${environment.apiUrl}/Categories/order`);
        expect(request.request.method).toBe('GET');
        request.flush({ categoryIds: ['rent-id', 'food-id'] });
    });

    it('updates the saved category order for the current user', () => {
        service.updateCategoryOrder({ categoryIds: ['rent-id', 'food-id'] }).subscribe();

        const request = httpMock.expectOne(`${environment.apiUrl}/Categories/order`);
        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({ categoryIds: ['rent-id', 'food-id'] });
        request.flush(null);
    });

    it('resets the saved category order for the current user through the existing PUT endpoint', () => {
        service.resetCategoryOrder({ categoryIds: ['food-id', 'rent-id'] }).subscribe();

        const request = httpMock.expectOne(`${environment.apiUrl}/Categories/order`);
        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({ categoryIds: ['food-id', 'rent-id'] });
        request.flush(null);
    });

    it('updates the saved balance display setting for the current user', () => {
        service.updateBalanceDisplaySettings({ balanceDisplayAccountId: 'all' }).subscribe();

        const request = httpMock.expectOne(
            `${environment.apiUrl}/Users/me/settings/balance-display`,
        );
        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({ balanceDisplayAccountId: 'all' });
        request.flush({
            id: 'user-123',
            username: 'Alex',
            email: 'alex@example.com',
            balanceDisplayAccountId: 'all',
        });
    });

    it('sends trimmed server-side transaction filters with pagination', () => {
        service
            .getTransactions({
                accountId: 'account-id',
                fromDate: '2026-08-01T00:00:00.000Z',
                toDate: '2026-09-01T00:00:00.000Z',
                search: '  salary  ',
                page: 2,
                size: 25,
            })
            .subscribe();

        const request = httpMock.expectOne(
            (candidate) => candidate.url === `${environment.apiUrl}/Transactions`,
        );

        expect(request.request.method).toBe('GET');
        expect(request.request.params.get('accountId')).toBe('account-id');
        expect(request.request.params.get('fromDate')).toBe('2026-08-01T00:00:00.000Z');
        expect(request.request.params.get('toDate')).toBe('2026-09-01T00:00:00.000Z');
        expect(request.request.params.get('search')).toBe('salary');
        expect(request.request.params.get('page')).toBe('2');
        expect(request.request.params.get('size')).toBe('25');
        expect(request.request.params.get('sortBy')).toBe('date');
        expect(request.request.params.get('sortDirection')).toBe('desc');
        request.flush({
            items: [],
            page: 2,
            size: 25,
            totalCount: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        });
    });

    it('skips the current recurring occurrence through the dedicated action endpoint', () => {
        service.skipRecurringTransaction('recurring-id').subscribe();

        const request = httpMock.expectOne(
            `${environment.apiUrl}/recurring-transactions/recurring-id/skip`,
        );
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({});
        request.flush(null);
    });
});
