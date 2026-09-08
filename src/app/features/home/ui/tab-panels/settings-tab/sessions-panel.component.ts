import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, AuthSessionItem } from '../../../../auth/data-access/auth.service';
import { AuthStore } from '../../../../auth/data-access/auth.store';
import { Button } from '../../../../../shared/ui/button/button';

@Component({
    selector: 'ms-sessions-panel',
    standalone: true,
    imports: [Button, DatePipe],
    templateUrl: './sessions-panel.component.html',
    styleUrl: './sessions-panel.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsPanelComponent {
    private readonly auth = inject(AuthService);
    private readonly store = inject(AuthStore);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    readonly sessions = signal<AuthSessionItem[]>([]);
    readonly busy = signal(false);
    readonly loaded = signal(false);
    readonly error = signal('');

    constructor() {
        this.reload();
    }

    reload(): void {
        if (this.busy()) return;
        this.busy.set(true);
        this.error.set('');
        this.auth
            .sessions()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.busy.set(false)),
            )
            .subscribe({
                next: (items) => {
                    this.sessions.set(items);
                    this.loaded.set(true);
                },
                error: () => this.error.set('Не удалось загрузить сеансы. Попробуйте ещё раз.'),
            });
    }

    revoke(session?: AuthSessionItem): void {
        if (this.busy()) return;
        this.busy.set(true);
        this.error.set('');
        const request = session ? this.auth.revokeSession(session.clientId) : this.auth.logoutAll();
        request
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.busy.set(false)),
            )
            .subscribe({
                next: () => {
                    if (!session || session.isCurrent) {
                        this.store.clearSession();
                        void this.router.navigateByUrl('/auth');
                    } else {
                        this.sessions.update((items) =>
                            items.filter((item) => item.clientId !== session.clientId),
                        );
                    }
                },
                error: () =>
                    this.error.set('Не удалось завершить сеанс. Проверьте соединение и повторите.'),
            });
    }
}
