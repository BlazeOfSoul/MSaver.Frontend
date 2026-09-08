import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GlobalLoadingService } from '../loading/global-loading.service';
import { PwaUpdateBanner } from './pwa-update-banner';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateBanner', () => {
    it('lets the user reload only after pending requests finish', async () => {
        const updateReady = signal(false);
        const reload = vi.fn();
        TestBed.configureTestingModule({
            imports: [PwaUpdateBanner],
            providers: [
                {
                    provide: PwaUpdateService,
                    useValue: { updateReady, recoveryRequired: signal(false), reload },
                },
            ],
        });
        const fixture = TestBed.createComponent(PwaUpdateBanner);
        const loading = TestBed.inject(GlobalLoadingService);
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('aside')).toBeNull();

        updateReady.set(true);
        loading.start();
        fixture.detectChanges();
        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        expect(button.disabled).toBe(true);
        button.click();
        expect(reload).not.toHaveBeenCalled();

        loading.stop();
        fixture.detectChanges();
        button.click();
        expect(reload).toHaveBeenCalledOnce();
    });
});
