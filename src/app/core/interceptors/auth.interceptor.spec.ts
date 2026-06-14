import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
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
        accessToken: ReturnType<typeof signal<string | null>>;
        refreshToken: ReturnType<typeof signal<string | null>>;
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
            accessToken: signal('access-token'),
            refreshToken: signal<string | null>(null),
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

    it('redirects to auth when a protected request returns unauthorized without a refresh token', () => {
        const errorSpy = vi.fn();

        http.get('/api/Accounts').subscribe({ error: errorSpy });

        const request = httpMock.expectOne('/api/Accounts');
        expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');

        request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

        expect(authStore.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
        expect(errorSpy).toHaveBeenCalledOnce();
        expect(authService.refresh).not.toHaveBeenCalled();
    });

    it('keeps authorization on protected endpoints that only share an auth URL prefix', () => {
        const responseSpy = vi.fn();

        http.get('/api/Auth/login-history').subscribe({ next: responseSpy });

        const request = httpMock.expectOne('/api/Auth/login-history');
        expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');

        request.flush({ ok: true });

        expect(responseSpy).toHaveBeenCalledWith({ ok: true });
    });

    it('does not attach authorization to non-api requests', () => {
        const responseSpy = vi.fn();

        http.get('https://cdn.example.com/config.json').subscribe({ next: responseSpy });

        const request = httpMock.expectOne('https://cdn.example.com/config.json');
        expect(request.request.headers.has('Authorization')).toBe(false);

        request.flush({ ok: true });

        expect(responseSpy).toHaveBeenCalledWith({ ok: true });
    });

    it('does not refresh or clear the session when a non-api request returns unauthorized', () => {
        const errorSpy = vi.fn();
        authStore.refreshToken.set('refresh-token');

        http.get('/assets/config.json').subscribe({ error: errorSpy });

        const request = httpMock.expectOne('/assets/config.json');
        expect(request.request.headers.has('Authorization')).toBe(false);

        request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

        expect(authService.refresh).not.toHaveBeenCalled();
        expect(authStore.clearSession).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('redirects to auth when token refresh fails', () => {
        const errorSpy = vi.fn();
        authStore.refreshToken.set('refresh-token');
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

        expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
        expect(authStore.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
        expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('shares one refresh request across parallel unauthorized responses', () => {
        const firstSpy = vi.fn();
        const secondSpy = vi.fn();
        const refreshResponse$ = new Subject<AuthSessionResponse>();
        authStore.refreshToken.set('refresh-token');
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
        expect(authService.refresh).toHaveBeenCalledWith('refresh-token');

        refreshResponse$.next({
            accessToken: 'next-access-token',
            refreshToken: 'next-refresh-token',
            clientId: 'client-id',
            id: 'user-id',
            name: 'Alex',
            email: 'alex@example.com',
        });
        refreshResponse$.complete();

        const retriedRequests = httpMock.match((request) =>
            ['/api/Accounts', '/api/Categories'].includes(request.url),
        );

        expect(retriedRequests).toHaveLength(2);
        expect(
            retriedRequests.every(
                (request) =>
                    request.request.headers.get('Authorization') === 'Bearer next-access-token',
            ),
        ).toBe(true);

        retriedRequests[0].flush({ ok: true });
        retriedRequests[1].flush({ ok: true });

        expect(authStore.setSession).toHaveBeenCalledOnce();
        expect(firstSpy).toHaveBeenCalledWith({ ok: true });
        expect(secondSpy).toHaveBeenCalledWith({ ok: true });
    });
});
