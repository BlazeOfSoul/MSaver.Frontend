import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../../features/auth/data-access/auth.store';
import { AuthService } from '../../features/auth/data-access/auth.service';

const AUTH_URLS = ['/api/Auth/login', '/api/Auth/register', '/api/Auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authStore = inject(AuthStore);
    const authService = inject(AuthService);

    const token = authStore.accessToken();
    const isAuthRequest = AUTH_URLS.some((url) => req.url.includes(url));

    const request =
        token && !isAuthRequest
            ? req.clone({
                  setHeaders: {
                      Authorization: `Bearer ${token}`,
                  },
              })
            : req;

    return next(request).pipe(
        catchError((error: HttpErrorResponse) => {
            const refreshToken = authStore.refreshToken();

            if (error.status !== 401 || isAuthRequest || !refreshToken) {
                return throwError(() => error);
            }

            return authService.refresh(refreshToken).pipe(
                switchMap((response) => {
                    authStore.setSession(response);

                    const retryRequest = req.clone({
                        setHeaders: {
                            Authorization: `Bearer ${response.accessToken}`,
                        },
                    });

                    return next(retryRequest);
                }),
                catchError((refreshError) => {
                    authStore.clearSession();
                    return throwError(() => refreshError);
                }),
            );
        }),
    );
};
