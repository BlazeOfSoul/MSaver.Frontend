import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { Observable, of, throwError } from 'rxjs';
import { PwaPushNotificationService } from './pwa-push-notification.service';

function pushSubscription(overrides: Partial<PushSubscription> = {}): PushSubscription {
    return {
        endpoint: 'https://push.example.test/subscription',
        expirationTime: null,
        options: {} as PushSubscriptionOptions,
        getKey: vi.fn(),
        toJSON: vi.fn(() => ({
            endpoint: 'https://push.example.test/subscription',
            keys: {
                p256dh: 'public-key',
                auth: 'auth-secret',
            },
        })),
        unsubscribe: vi.fn(() => Promise.resolve(true)),
        ...overrides,
    } as PushSubscription;
}

describe('PwaPushNotificationService', () => {
    let service: PwaPushNotificationService;
    let subscription: PushSubscription;
    let swPush: {
        isEnabled: boolean;
        subscription: Observable<PushSubscription | null>;
        requestSubscription: ReturnType<typeof vi.fn>;
    };
    let http: {
        get: ReturnType<typeof vi.fn>;
        post: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        subscription = pushSubscription();
        swPush = {
            isEnabled: true,
            subscription: of(subscription),
            requestSubscription: vi.fn(),
        };
        http = {
            get: vi.fn(() => of({ publicKey: 'vapid-public-key' })),
            post: vi.fn(() => of(undefined)),
            delete: vi.fn(() => of(undefined)),
        };

        vi.stubGlobal('Notification', { permission: 'default' });

        TestBed.configureTestingModule({
            providers: [
                PwaPushNotificationService,
                { provide: SwPush, useValue: swPush },
                { provide: HttpClient, useValue: http },
            ],
        });

        service = TestBed.inject(PwaPushNotificationService);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('reuses and registers an existing browser subscription', async () => {
        await expect(service.enable()).resolves.toBe('enabled');

        expect(swPush.requestSubscription).not.toHaveBeenCalled();
        expect(http.get).toHaveBeenCalledWith('/api/push-subscriptions/vapid-public-key');
        expect(http.post).toHaveBeenCalledWith('/api/push-subscriptions', {
            endpoint: subscription.endpoint,
            p256dh: 'public-key',
            auth: 'auth-secret',
        });
    });

    it('revokes a newly-created local subscription when backend registration fails', async () => {
        const createdSubscription = pushSubscription();
        swPush.subscription = of(null);
        swPush.requestSubscription.mockResolvedValue(createdSubscription);
        http.post.mockReturnValue(throwError(() => new Error('backend unavailable')));

        await expect(service.enable()).resolves.toBe('failed');

        expect(swPush.requestSubscription).toHaveBeenCalledWith({
            serverPublicKey: 'vapid-public-key',
        });
        expect(createdSubscription.unsubscribe).toHaveBeenCalledOnce();
        await expect(service.getCurrentDeviceStatus()).resolves.toBe('disabled');
    });

    it('revokes an existing local subscription when backend registration fails', async () => {
        http.post.mockReturnValue(throwError(() => new Error('backend unavailable')));

        await expect(service.enable()).resolves.toBe('failed');

        expect(swPush.requestSubscription).not.toHaveBeenCalled();
        expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    });

    it('reports whether the current browser has an active subscription', async () => {
        await expect(service.getCurrentDeviceStatus()).resolves.toBe('enabled');

        swPush.subscription = of(null);
        await expect(service.getCurrentDeviceStatus()).resolves.toBe('disabled');

        vi.stubGlobal('Notification', { permission: 'denied' });
        await expect(service.getCurrentDeviceStatus()).resolves.toBe('denied');

        swPush.isEnabled = false;
        await expect(service.getCurrentDeviceStatus()).resolves.toBe('unsupported');
    });

    it('revokes the local subscription even when server unregister fails', async () => {
        http.delete.mockReturnValue(throwError(() => new Error('network unavailable')));

        await expect(service.disable()).resolves.toBeUndefined();

        expect(http.delete).toHaveBeenCalledWith('/api/push-subscriptions', {
            body: { endpoint: subscription.endpoint },
        });
        expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    });

    it('does not fail logout cleanup when reading or revoking the local subscription fails', async () => {
        swPush.subscription = throwError(() => new Error('service worker unavailable'));

        await expect(service.disable()).resolves.toBeUndefined();
        expect(http.delete).not.toHaveBeenCalled();

        swPush.subscription = of(
            pushSubscription({
                unsubscribe: vi.fn(() => Promise.reject(new Error('already revoked'))),
            }),
        );

        await expect(service.disable()).resolves.toBeUndefined();
    });
});
