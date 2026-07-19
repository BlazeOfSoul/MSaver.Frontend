import { inject, Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LocalPushSubscriptionService {
    private readonly swPush = inject(SwPush);

    async getCurrent(): Promise<PushSubscription | null> {
        if (!this.swPush.isEnabled) {
            return null;
        }

        return firstValueFrom(this.swPush.subscription).catch(() => null);
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
