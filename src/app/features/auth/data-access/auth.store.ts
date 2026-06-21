import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthSessionResponse } from '../../../core/models/auth.models';

@Injectable({
    providedIn: 'root',
})
export class AuthStore {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    private readonly accessTokenSignal = signal<string | null>(this.readStorage('access_token'));
    private readonly refreshTokenSignal = signal<string | null>(this.readStorage('refresh_token'));
    private readonly clientIdSignal = signal<string | null>(this.readStorage('client_id'));
    private readonly userIdSignal = signal<string | null>(this.readStorage('user_id'));
    private readonly userNameSignal = signal<string | null>(this.readUserNameStorage());
    private readonly userEmailSignal = signal<string | null>(this.readStorage('user_email'));

    readonly accessToken = computed(() => this.accessTokenSignal());
    readonly refreshToken = computed(() => this.refreshTokenSignal());
    readonly clientId = computed(() => this.clientIdSignal());
    readonly userId = computed(() => this.userIdSignal());
    readonly userName = computed(() => this.userNameSignal());
    readonly userEmail = computed(() => this.userEmailSignal());
    readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

    setSession(response: AuthSessionResponse): void {
        const userName = this.resolveSessionUserName(response);

        this.writeStorage('access_token', response.accessToken);
        this.writeStorage('refresh_token', response.refreshToken);
        this.writeStorage('client_id', response.clientId);
        this.writeStorage('user_id', response.id);
        this.writeOptionalStorage('user_name', userName);
        this.writeStorage('user_email', response.email);

        this.accessTokenSignal.set(response.accessToken);
        this.refreshTokenSignal.set(response.refreshToken);
        this.clientIdSignal.set(response.clientId);
        this.userIdSignal.set(response.id);
        this.userNameSignal.set(userName);
        this.userEmailSignal.set(response.email);
    }

    clearSession(): void {
        this.removeStorage('access_token');
        this.removeStorage('refresh_token');
        this.removeStorage('client_id');
        this.removeStorage('user_id');
        this.removeStorage('user_name');
        this.removeStorage('user_email');

        this.accessTokenSignal.set(null);
        this.refreshTokenSignal.set(null);
        this.clientIdSignal.set(null);
        this.userIdSignal.set(null);
        this.userNameSignal.set(null);
        this.userEmailSignal.set(null);
    }

    private readStorage(key: string): string | null {
        if (!this.isBrowser) {
            return null;
        }

        const sessionStorage = this.getBrowserStorage('sessionStorage');
        const localStorage = this.getBrowserStorage('localStorage');
        const sessionValue = this.safeGetStorageValue(sessionStorage, key);

        if (sessionValue !== null) {
            return sessionValue;
        }

        const legacyValue = this.safeGetStorageValue(localStorage, key);

        if (legacyValue !== null) {
            this.safeSetStorageValue(sessionStorage, key, legacyValue);
            this.safeRemoveStorageValue(localStorage, key);
        }

        return legacyValue;
    }

    private writeStorage(key: string, value: string): void {
        if (!this.isBrowser) {
            return;
        }

        this.safeSetStorageValue(this.getBrowserStorage('sessionStorage'), key, value);
        this.safeRemoveStorageValue(this.getBrowserStorage('localStorage'), key);
    }

    private writeOptionalStorage(key: string, value: string | null): void {
        if (value === null) {
            this.removeStorage(key);
            return;
        }

        this.writeStorage(key, value);
    }

    private removeStorage(key: string): void {
        if (!this.isBrowser) {
            return;
        }

        this.safeRemoveStorageValue(this.getBrowserStorage('sessionStorage'), key);
        this.safeRemoveStorageValue(this.getBrowserStorage('localStorage'), key);
    }

    private getBrowserStorage(storageKey: 'localStorage' | 'sessionStorage'): Storage | null {
        try {
            return globalThis[storageKey] ?? null;
        } catch {
            return null;
        }
    }

    private safeGetStorageValue(storage: Storage | null, key: string): string | null {
        if (!storage) {
            return null;
        }

        try {
            return storage.getItem(key);
        } catch {
            return null;
        }
    }

    private safeSetStorageValue(storage: Storage | null, key: string, value: string): void {
        if (!storage) {
            return;
        }

        try {
            storage.setItem(key, value);
        } catch {
            return;
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

    private readUserNameStorage(): string | null {
        return this.normalizeUserName(this.readStorage('user_name'));
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
