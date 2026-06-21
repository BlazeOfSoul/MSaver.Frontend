import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { AuthSessionResponse } from '../models/auth.models';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { AuthStore } from '../../features/auth/data-access/auth.store';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let authStore: {
        clearSession: ReturnType<typeof vi.fn>;
        setSession: ReturnType<typeof vi.fn>;
    };
    let authService: {
        refresh: ReturnType<typeof vi.fn>;
    };
    let router: {
        navigateByUrl: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        authStore = {
            clearSession: vi.fn(),
            setSession: vi.fn(),
        };
        authService = {
            refresh: vi.fn(),
        };
        router = {
            navigateByUrl: vi.fn(() => Promise.resolve(true)),
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                { provide: AuthStore, useValue: authStore },
                { provide: AuthService, useValue: authService },
                { provide: Router, useValue: router },
            ],
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('sends API requests with credentials and without an authorization header', () => {
        const responseSpy = vi.fn();

        http.get('/api/Accounts').subscribe({ next: responseSpy });

        const request = httpMock.expectOne('/api/Accounts');
        expect(request.request.withCredentials).toBe(true);
        expect(request.request.headers.has('Authorization')).toBe(false);

        request.flush({ ok: true });

        expect(responseSpy).toHaveBeenCalledWith({ ok: true });
    });

    it('does not attach credentials to non-api requests', () => {
        const responseSpy = vi.fn();

        http.get('https://cdn.example.com/config.json').subscribe({ next: responseSpy });

        const request = httpMock.expectOne('https://cdn.example.com/config.json');
        expect(request.request.withCredentials).toBe(false);
        expect(request.request.headers.has('Authorization')).toBe(false);

        request.flush({ ok: true });

        expect(responseSpy).toHaveBeenCalledWith({ ok: true });
    });

    it('refreshes from cookies and retries protected requests after unauthorized responses', () => {
        const responseSpy = vi.fn();
        const refreshResponse: AuthSessionResponse = {
            id: 'user-id',
            name: 'Alex',
            email: 'alex@example.com',
            clientId: 'client-id',
        };
        const refresh$ = new Subject<AuthSessionResponse>();
        authService.refresh.mockReturnValue(refresh$);

        http.get('/api/Accounts').subscribe({ next: responseSpy });

        const request = httpMock.expectOne('/api/Accounts');
        request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

        expect(authService.refresh).toHaveBeenCalledTimes(1);
        expect(authService.refresh).toHaveBeenCalledWith();

        refresh$.next(refreshResponse);
        refresh$.complete();

        const retryRequest = httpMock.expectOne('/api/Accounts');
        expect(retryRequest.request.withCredentials).toBe(true);
        expect(retryRequest.request.headers.has('Authorization')).toBe(false);
        retryRequest.flush({ ok: true });

        expect(authStore.setSession).toHaveBeenCalledWith(refreshResponse);
        expect(responseSpy).toHaveBeenCalledWith({ ok: true });
    });

    it('shares one refresh request across parallel unauthorized responses', () => {
        const firstSpy = vi.fn();
        const secondSpy = vi.fn();
        const refreshResponse$ = new Subject<AuthSessionResponse>();
        authService.refresh.mockReturnValue(refreshResponse$);

        http.get('/api/Accounts').subscribe({ next: firstSpy });
        http.get('/api/Categories').subscribe({ next: secondSpy });

        const firstRequest = httpMock.expectOne('/api/Accounts');
        const secondRequest = httpMock.expectOne('/api/Categories');

        firstRequest.flush(
            { message: 'Unauthorized' },
            { status: 401, statusText: 'Unauthorized' },
        );
        secondRequest.flush(
            { message: 'Unauthorized' },
            { status: 401, statusText: 'Unauthorized' },
        );

        expect(authService.refresh).toHaveBeenCalledTimes(1);
        expect(authService.refresh).toHaveBeenCalledWith();

        refreshResponse$.next({
            id: 'user-id',
            name: 'Alex',
            email: 'alex@example.com',
            clientId: 'client-id',
        });
        refreshResponse$.complete();

        const retriedRequests = httpMock.match((request) =>
            ['/api/Accounts', '/api/Categories'].includes(request.url),
        );

        expect(retriedRequests).toHaveLength(2);
        expect(retriedRequests.every((request) => request.request.withCredentials)).toBe(true);
        expect(
            retriedRequests.every((request) => !request.request.headers.has('Authorization')),
        ).toBe(true);

        retriedRequests[0].flush({ ok: true });
        retriedRequests[1].flush({ ok: true });

        expect(authStore.setSession).toHaveBeenCalledOnce();
        expect(firstSpy).toHaveBeenCalledWith({ ok: true });
        expect(secondSpy).toHaveBeenCalledWith({ ok: true });
    });

    it('clears the session and redirects to auth when cookie refresh fails', () => {
        const errorSpy = vi.fn();
        authService.refresh.mockReturnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 401,
                        statusText: 'Unauthorized',
                    }),
            ),
        );

        http.get('/api/Accounts').subscribe({ error: errorSpy });

        const request = httpMock.expectOne('/api/Accounts');
        request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

        expect(authService.refresh).toHaveBeenCalledWith();
        expect(authStore.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
        expect(errorSpy).toHaveBeenCalledOnce();
    });
});
