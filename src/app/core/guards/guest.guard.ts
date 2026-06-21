import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { AuthStore } from '../../features/auth/data-access/auth.store';

export const guestGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authStore.isAuthenticated()) {
        return router.createUrlTree(['/']);
    }

    return authService.refresh().pipe(
        tap((session) => authStore.setSession(session)),
        map(() => router.createUrlTree(['/'])),
        catchError(() => {
            authStore.clearSession();
            return of(true);
        }),
    );
};
