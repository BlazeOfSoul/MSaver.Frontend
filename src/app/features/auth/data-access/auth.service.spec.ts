import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('sends login with credentials so auth cookies can be set', () => {
        service.login({ email: 'alex@example.com', password: 'Qwerty123!' }).subscribe();

        const request = httpMock.expectOne('/api/Auth/login');
        expect(request.request.withCredentials).toBe(true);
        request.flush({
            id: 'user-id',
            name: 'Alex',
            email: 'alex@example.com',
            clientId: 'client-id',
        });
    });

    it('refreshes from the HttpOnly cookie without sending a token body', () => {
        service.refresh().subscribe();

        const request = httpMock.expectOne('/api/Auth/refresh');
        expect(request.request.withCredentials).toBe(true);
        expect(request.request.body).toEqual({});
        request.flush({
            id: 'user-id',
            name: 'Alex',
            email: 'alex@example.com',
            clientId: 'client-id',
        });
    });

    it('logs out with credentials and without exposing the client id in the body', () => {
        service.logout().subscribe();

        const request = httpMock.expectOne('/api/Auth/logout');
        expect(request.request.withCredentials).toBe(true);
        expect(request.request.body).toEqual({});
        request.flush(null);
    });
});
