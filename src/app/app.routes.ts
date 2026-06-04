import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const appRoutes: Routes = [
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/home/ui/home-page.component').then((m) => m.HomePageComponent),
    },
    {
        path: 'auth',
        canActivate: [guestGuard],
        loadComponent: () =>
            import('./features/auth/ui/auth-page.component').then((m) => m.AuthPageComponent),
    },
    {
        path: '**',
        redirectTo: '',
    },
];
