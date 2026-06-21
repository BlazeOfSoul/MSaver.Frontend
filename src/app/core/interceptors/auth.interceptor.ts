import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthSessionResponse } from '../models/auth.models';
import { AuthStore } from '../../features/auth/data-access/auth.store';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { currentOrigin, isApiRequestUrl } from '../http/api-url.utils';

const AUTH_PATHS = new Set(['/api/Auth/login', '/api/Auth/register', '/api/Auth/refresh']);
let refreshSession$: Observable<AuthSessionResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authStore = inject(AuthStore);
    const authService = inject(AuthService);
    const router = inject(Router);

    const isAuthRequest = isAuthEndpoint(req.url);
    const isApiRequest = isApiRequestUrl(req.url);
    const request = isApiRequest ? withCookieCredentials(req) : req;
    const clearSessionAndRedirect = () => {
        authStore.clearSession();
        void router.navigateByUrl('/auth');
    };

    return next(request).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status !== 401 || isAuthRequest || !isApiRequest) {
                return throwError(() => error);
            }

            if (!refreshSession$) {
                refreshSession$ = authService.refresh().pipe(
                    tap((response) => authStore.setSession(response)),
                    catchError((refreshError) => {
                        clearSessionAndRedirect();
                        return throwError(() => refreshError);
                    }),
                    finalize(() => {
                        refreshSession$ = null;
                    }),
                    shareReplay({ bufferSize: 1, refCount: false }),
                );
            }

            return refreshSession$.pipe(switchMap(() => next(withCookieCredentials(req))));
        }),
    );
};

function withCookieCredentials<T>(req: HttpRequest<T>): HttpRequest<T> {
    return req.withCredentials ? req : req.clone({ withCredentials: true });
}

function isAuthEndpoint(url: string): boolean {
    try {
        return AUTH_PATHS.has(new URL(url, currentOrigin()).pathname);
    } catch {
        return AUTH_PATHS.has(url.split(/[?#]/, 1)[0]);
    }
}
