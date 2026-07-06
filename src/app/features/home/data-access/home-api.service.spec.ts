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
});
