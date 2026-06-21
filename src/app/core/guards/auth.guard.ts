import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { AuthStore } from '../../features/auth/data-access/auth.store';

export const authGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authStore.isAuthenticated()) {
        return true;
    }

    return authService.refresh().pipe(
        tap((session) => authStore.setSession(session)),
        map(() => true),
        catchError(() => {
            authStore.clearSession();
            return of(router.createUrlTree(['/auth']));
        }),
    );
};
