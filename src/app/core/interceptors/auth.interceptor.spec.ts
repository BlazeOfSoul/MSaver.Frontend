import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
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

        request.flush(
            { message: 'Unauthorized' },
            { status: 401, statusText: 'Unauthorized' },
        );

        expect(authStore.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
        expect(errorSpy).toHaveBeenCalledOnce();
        expect(authService.refresh).not.toHaveBeenCalled();
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
        request.flush(
            { message: 'Unauthorized' },
            { status: 401, statusText: 'Unauthorized' },
        );

        expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
        expect(authStore.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
        expect(errorSpy).toHaveBeenCalledOnce();
    });
});
