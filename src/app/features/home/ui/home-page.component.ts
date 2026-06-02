import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../auth/data-access/auth.store';

@Component({
    selector: 'app-home-page',
    standalone: true,
    template: `
        <section>
            <h1>MSaver</h1>
            <p>Вы авторизованы.</p>
            <p>User ID: {{ authStore.userId() }}</p>

            <button type="button" (click)="logout()">Выйти</button>
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
    readonly authStore = inject(AuthStore);
    private readonly router = inject(Router);

    logout(): void {
        this.authStore.clearSession();
        this.router.navigateByUrl('/auth');
    }
}
