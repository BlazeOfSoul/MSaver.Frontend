import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    PushSubscriptionRequest,
    VapidPublicKeyResponse,
} from '../../features/home/data-access/home-api.models';
import { LocalPushSubscriptionService } from './local-push-subscription.service';

export type PushNotificationStatus =
    | 'enabled'
    | 'denied'
    | 'unsupported'
    | 'not-configured'
    | 'failed';

export type CurrentDevicePushStatus = 'enabled' | 'disabled' | 'denied' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class PwaPushNotificationService {
    private readonly swPush = inject(SwPush);
    private readonly http = inject(HttpClient);
    private readonly localPushSubscription = inject(LocalPushSubscriptionService);

    async getCurrentDeviceStatus(): Promise<CurrentDevicePushStatus> {
        if (!this.swPush.isEnabled || !('Notification' in globalThis)) {
            return 'unsupported';
        }

        if (Notification.permission === 'denied') {
            return 'denied';
        }

        const subscription = await this.localPushSubscription.getCurrent();
        return subscription ? 'enabled' : 'disabled';
    }

    async enable(): Promise<PushNotificationStatus> {
        if (!this.swPush.isEnabled || !('Notification' in globalThis)) {
            return 'unsupported';
        }

        if (Notification.permission === 'denied') {
            return 'denied';
        }

        let subscription: PushSubscription | null = null;

        try {
            const { publicKey } = await firstValueFrom(
                this.http.get<VapidPublicKeyResponse>(
                    `${environment.apiUrl}/push-subscriptions/vapid-public-key`,
                ),
            );

            if (!publicKey) {
                return 'not-configured';
            }

            const existingSubscription = await this.localPushSubscription.getCurrent();
            subscription =
                existingSubscription ??
                (await this.swPush.requestSubscription({ serverPublicKey: publicKey }));
            const json = subscription.toJSON();
            const payload: PushSubscriptionRequest = {
                endpoint: subscription.endpoint,
                p256dh: json.keys?.['p256dh'] ?? '',
                auth: json.keys?.['auth'] ?? '',
            };

            if (!payload.p256dh || !payload.auth) {
                await this.localPushSubscription.unsubscribe(subscription);
                return 'failed';
            }

            await firstValueFrom(
                this.http.post<void>(`${environment.apiUrl}/push-subscriptions`, payload),
            );
            return 'enabled';
        } catch {
            // A browser subscription is useful only after the endpoint is registered
            // for the current user. Revoke both newly-created and reused local
            // subscriptions when registration fails so the UI cannot report a
            // misleading enabled state.
            await this.localPushSubscription.unsubscribe(subscription);
            return 'failed';
        }
    }

    async disable(): Promise<void> {
        if (!this.swPush.isEnabled) {
            return;
        }

        const subscription = await this.localPushSubscription.getCurrent();
        if (!subscription) {
            return;
        }

        try {
            await firstValueFrom(
                this.http.delete<void>(`${environment.apiUrl}/push-subscriptions`, {
                    body: { endpoint: subscription.endpoint },
                }),
            );
        } catch {
            // The local subscription still has to be revoked. The server removes stale
            // endpoints after a 404/410 response if this request could not reach it.
        }

        await this.localPushSubscription.unsubscribe(subscription);
    }
}
