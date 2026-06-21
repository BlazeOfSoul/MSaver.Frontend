import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthSessionResponse } from '../../../core/models/auth.models';

const LEGACY_SESSION_KEYS = [
    'access_token',
    'refresh_token',
    'client_id',
    'user_id',
    'user_name',
    'user_email',
];

@Injectable({
    providedIn: 'root',
})
export class AuthStore {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    private readonly clientIdSignal = signal<string | null>(null);
    private readonly userIdSignal = signal<string | null>(null);
    private readonly userNameSignal = signal<string | null>(null);
    private readonly userEmailSignal = signal<string | null>(null);

    readonly clientId = computed(() => this.clientIdSignal());
    readonly userId = computed(() => this.userIdSignal());
    readonly userName = computed(() => this.userNameSignal());
    readonly userEmail = computed(() => this.userEmailSignal());
    readonly isAuthenticated = computed(() => !!this.userIdSignal());

    constructor() {
        this.clearLegacyBrowserSession();
    }

    setSession(response: AuthSessionResponse): void {
        this.clientIdSignal.set(response.clientId);
        this.userIdSignal.set(response.id);
        this.userNameSignal.set(this.resolveSessionUserName(response));
        this.userEmailSignal.set(response.email);
        this.clearLegacyBrowserSession();
    }

    clearSession(): void {
        this.clientIdSignal.set(null);
        this.userIdSignal.set(null);
        this.userNameSignal.set(null);
        this.userEmailSignal.set(null);
        this.clearLegacyBrowserSession();
    }

    private clearLegacyBrowserSession(): void {
        if (!this.isBrowser) {
            return;
        }

        const storages = [
            this.getBrowserStorage('sessionStorage'),
            this.getBrowserStorage('localStorage'),
        ];

        storages.forEach((storage) => {
            LEGACY_SESSION_KEYS.forEach((key) => this.safeRemoveStorageValue(storage, key));
        });
    }

    private getBrowserStorage(storageKey: 'localStorage' | 'sessionStorage'): Storage | null {
        try {
            return globalThis[storageKey] ?? null;
        } catch {
            return null;
        }
    }

    private safeRemoveStorageValue(storage: Storage | null, key: string): void {
        if (!storage) {
            return;
        }

        try {
            storage.removeItem(key);
        } catch {
            return;
        }
    }

    private resolveSessionUserName(response: AuthSessionResponse): string | null {
        return this.normalizeUserName(response.name) ?? this.normalizeUserName(response.username);
    }

    private normalizeUserName(value: string | null | undefined): string | null {
        const trimmed = value?.trim();

        if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
            return null;
        }

        return trimmed;
    }
}
