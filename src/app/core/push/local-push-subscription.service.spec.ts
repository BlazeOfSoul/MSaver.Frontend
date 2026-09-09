import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { NEVER } from 'rxjs';
import { LocalPushSubscriptionService } from './local-push-subscription.service';

describe('Local push subscription lookup', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('does not wait for Angular service worker registration on first navigation', async () => {
        TestBed.configureTestingModule({
            providers: [{ provide: SwPush, useValue: { isEnabled: true, subscription: NEVER } }],
        });
        const getRegistration = vi.fn(async () => undefined);
        vi.stubGlobal('navigator', { serviceWorker: { getRegistration } });
        await expect(TestBed.inject(LocalPushSubscriptionService).getCurrent()).resolves.toBeNull();
        expect(getRegistration).toHaveBeenCalledOnce();
    });
    it('reads the existing native subscription', async () => {
        const subscription = { endpoint: 'https://push.example.test/current' };
        TestBed.configureTestingModule({
            providers: [{ provide: SwPush, useValue: { isEnabled: true, subscription: NEVER } }],
        });
        vi.stubGlobal('navigator', {
            serviceWorker: {
                getRegistration: async () => ({
                    pushManager: { getSubscription: async () => subscription },
                }),
            },
        });
        await expect(TestBed.inject(LocalPushSubscriptionService).getCurrent()).resolves.toBe(
            subscription,
        );
    });
});
