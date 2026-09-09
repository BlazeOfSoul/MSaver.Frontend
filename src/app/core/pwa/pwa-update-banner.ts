import { Component, inject } from '@angular/core';
import { GlobalLoadingService } from '../loading/global-loading.service';
import { PwaUpdateService } from './pwa-update.service';

@Component({
    selector: 'app-pwa-update-banner',
    template: `
        @if (updates.updateReady() || updates.recoveryRequired()) {
            <aside class="update-banner" aria-label="Обновление приложения">
                <p role="status">
                    @if (updates.recoveryRequired()) {
                        Для продолжения работы нужно перезагрузить приложение.
                    } @else {
                        Доступна новая версия MSaver.
                    }
                    <span>Сохраните введённые данные перед обновлением.</span>
                </p>
                <button type="button" [disabled]="loading.isLoading()" (click)="reload()">
                    Обновить
                </button>
            </aside>
        }
    `,
    styleUrl: './pwa-update-banner.css',
})
export class PwaUpdateBanner {
    protected readonly updates = inject(PwaUpdateService);
    protected readonly loading = inject(GlobalLoadingService);

    protected reload(): void {
        if (!this.loading.isLoading()) {
            this.updates.reload();
        }
    }
}
