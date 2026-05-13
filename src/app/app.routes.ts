import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { AuthPageComponent } from './features/auth/ui/auth-page.component';
import { HomePageComponent } from './features/home/ui/home-page.component';

export const appRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: HomePageComponent,
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    component: AuthPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
