import { inject, Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class LocalPushSubscriptionService {
    private readonly swPush = inject(SwPush);

    async getCurrent(): Promise<PushSubscription | null> {
        if (!this.swPush.isEnabled) {
            return null;
        }

        try {
            // Reading an existing registration resolves immediately even on a first
            // visit. SwPush.subscription waits for a worker and can hold up the
            // auth guards until registerWhenStable's 30-second fallback.
            const registration = await globalThis.navigator?.serviceWorker?.getRegistration();
            return (await registration?.pushManager?.getSubscription()) ?? null;
        } catch {
            return null;
        }
    }

    async unsubscribeCurrent(): Promise<void> {
        await this.unsubscribe(await this.getCurrent());
    }

    async unsubscribe(subscription: PushSubscription | null): Promise<void> {
        if (!subscription) {
            return;
        }

        try {
            await subscription.unsubscribe();
        } catch {
            // A missing or already revoked browser subscription is equivalent to
            // successful local cleanup.
        }
    }
}
