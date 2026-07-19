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
