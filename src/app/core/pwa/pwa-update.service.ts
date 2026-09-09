import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, fromEvent, interval, merge, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
    private readonly updates = inject(SwUpdate, { optional: true });
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly appRef = inject(ApplicationRef);
    private readonly ready = signal(false);
    private readonly recovery = signal(false);
    private checking = false;

    readonly updateReady = this.ready.asReadonly();
    readonly recoveryRequired = this.recovery.asReadonly();

    constructor() {
        const browserWindow = this.document.defaultView;
        if (!this.updates?.isEnabled || !browserWindow) {
            return;
        }

        this.updates.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
            if (event.type === 'VERSION_READY') {
                this.ready.set(true);
            }
        });

        this.updates.unrecoverable
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.recovery.set(true));

        // Poll only after startup so checks cannot delay worker registration.
        this.appRef.isStable
            .pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                void this.checkForUpdate();
                merge(
                    interval(60 * 60 * 1000),
                    fromEvent(browserWindow, 'online'),
                    fromEvent(this.document, 'visibilitychange'),
                )
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => void this.checkForUpdate());
            });
    }

    reload(): void {
        if (this.ready() || this.recovery()) {
            // Reload the complete app so its shell and lazy chunks stay in sync.
            this.document.defaultView?.location.reload();
        }
    }

    private async checkForUpdate(): Promise<void> {
        if (
            !this.updates?.isEnabled ||
            this.checking ||
            this.document.visibilityState === 'hidden' ||
            this.document.defaultView?.navigator.onLine === false
        ) {
            return;
        }

        this.checking = true;
        try {
            await this.updates.checkForUpdate();
        } catch {
            // Offline or failed downloads leave the current version usable.
            // The next online/visibility event or periodic check will retry.
        } finally {
            this.checking = false;
        }
    }
}
