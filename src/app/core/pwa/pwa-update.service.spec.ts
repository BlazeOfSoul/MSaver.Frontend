import { DOCUMENT } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
    let stable: Subject<boolean>;
    let versions: Subject<VersionEvent>;
    let unrecoverable: Subject<UnrecoverableStateEvent>;
    let updates: { isEnabled: boolean; checkForUpdate: ReturnType<typeof vi.fn> };
    let browserWindow: EventTarget & {
        navigator: { onLine: boolean };
        location: { reload: ReturnType<typeof vi.fn> };
    };
    let page: EventTarget & { defaultView: typeof browserWindow; visibilityState: string };

    beforeEach(() => {
        vi.useFakeTimers();
        stable = new Subject<boolean>();
        versions = new Subject<VersionEvent>();
        unrecoverable = new Subject<UnrecoverableStateEvent>();
        updates = { isEnabled: true, checkForUpdate: vi.fn().mockResolvedValue(false) };
        browserWindow = Object.assign(new EventTarget(), {
            navigator: { onLine: true },
            location: { reload: vi.fn() },
        });
        page = Object.assign(new EventTarget(), {
            defaultView: browserWindow,
            visibilityState: 'visible',
        });
        TestBed.configureTestingModule({
            providers: [
                { provide: DOCUMENT, useValue: page },
                { provide: ApplicationRef, useValue: { isStable: stable } },
                {
                    provide: SwUpdate,
                    useValue: Object.assign(updates, {
                        versionUpdates: versions,
                        unrecoverable,
                    }),
                },
            ],
        });
    });

    afterEach(() => {
        TestBed.resetTestingModule();
        vi.useRealTimers();
    });

    it('waits for startup and checks again while the application stays open', async () => {
        TestBed.inject(PwaUpdateService);
        stable.next(false);
        expect(updates.checkForUpdate).not.toHaveBeenCalled();

        stable.next(true);
        await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

        expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('offers a ready version without reloading unfinished work', () => {
        const service = TestBed.inject(PwaUpdateService);
        service.reload();
        expect(browserWindow.location.reload).not.toHaveBeenCalled();

        versions.next({
            type: 'VERSION_READY',
            currentVersion: { hash: 'old' },
            latestVersion: { hash: 'new' },
        });

        expect(service.updateReady()).toBe(true);
        expect(browserWindow.location.reload).not.toHaveBeenCalled();
        service.reload();
        expect(browserWindow.location.reload).toHaveBeenCalledOnce();
    });

    it('offers reload when cached application files cannot be recovered', () => {
        const service = TestBed.inject(PwaUpdateService);
        unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'Missing cached chunk' });

        expect(service.recoveryRequired()).toBe(true);
        expect(browserWindow.location.reload).not.toHaveBeenCalled();
        service.reload();
        expect(browserWindow.location.reload).toHaveBeenCalledOnce();
    });

    it('skips hidden/offline checks and retries a failed check on reconnect', async () => {
        TestBed.inject(PwaUpdateService);
        page.visibilityState = 'hidden';
        stable.next(true);
        expect(updates.checkForUpdate).not.toHaveBeenCalled();

        page.visibilityState = 'visible';
        browserWindow.navigator.onLine = false;
        page.dispatchEvent(new Event('visibilitychange'));
        expect(updates.checkForUpdate).not.toHaveBeenCalled();

        browserWindow.navigator.onLine = true;
        updates.checkForUpdate.mockRejectedValueOnce(new Error('Network unavailable'));
        browserWindow.dispatchEvent(new Event('online'));
        await Promise.resolve();
        browserWindow.dispatchEvent(new Event('online'));
        await Promise.resolve();

        expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('does not start overlapping checks and disposes listeners and timers', async () => {
        let finishCheck!: (value: boolean) => void;
        updates.checkForUpdate.mockReturnValueOnce(
            new Promise<boolean>((resolve) => (finishCheck = resolve)),
        );
        TestBed.inject(PwaUpdateService);
        stable.next(true);
        browserWindow.dispatchEvent(new Event('online'));
        page.dispatchEvent(new Event('visibilitychange'));
        expect(updates.checkForUpdate).toHaveBeenCalledOnce();

        finishCheck(false);
        await Promise.resolve();
        TestBed.resetTestingModule();
        await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
        browserWindow.dispatchEvent(new Event('online'));
        expect(updates.checkForUpdate).toHaveBeenCalledOnce();
    });

    it('does nothing when service workers are disabled', async () => {
        updates.isEnabled = false;
        const service = TestBed.inject(PwaUpdateService);
        stable.next(true);
        await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

        expect(updates.checkForUpdate).not.toHaveBeenCalled();
        expect(service.updateReady()).toBe(false);
    });
});
