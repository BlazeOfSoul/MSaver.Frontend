import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalLoadingService } from './core/loading/global-loading.service';
import { PwaUpdateBanner } from './core/pwa/pwa-update-banner';
import { ThemeService } from './shared/theme/theme.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, PwaUpdateBanner],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App {
    private readonly theme = inject(ThemeService);
    private readonly loading = inject(GlobalLoadingService);

    protected readonly title = signal('MSaver');
    protected readonly isGlobalLoading = this.loading.isLoading;
}
