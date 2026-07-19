import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, from, map, tap } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { AuthStore } from '../../features/auth/data-access/auth.store';
import { LocalPushSubscriptionService } from '../push/local-push-subscription.service';

export const authGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const authService = inject(AuthService);
    const router = inject(Router);
    const localPushSubscription = inject(LocalPushSubscriptionService);

    if (authStore.isAuthenticated()) {
        return true;
    }

    return authService.refresh().pipe(
        tap((session) => authStore.setSession(session)),
        map(() => true),
        catchError(() => {
            authStore.clearSession();
            return from(localPushSubscription.unsubscribeCurrent()).pipe(
                map(() => router.createUrlTree(['/auth'])),
            );
        }),
    );
};
