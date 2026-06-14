import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalLoadingService } from './core/loading/global-loading.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App {
    private readonly loading = inject(GlobalLoadingService);

    protected readonly title = signal('MSaver');
    protected readonly isGlobalLoading = this.loading.isLoading;
}
