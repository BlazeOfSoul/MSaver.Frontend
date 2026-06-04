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
    private readonly userNameSignal = signal<string | null>(this.readStorage('user_name'));
    private readonly userEmailSignal = signal<string | null>(this.readStorage('user_email'));

    readonly accessToken = computed(() => this.accessTokenSignal());
    readonly refreshToken = computed(() => this.refreshTokenSignal());
    readonly clientId = computed(() => this.clientIdSignal());
    readonly userId = computed(() => this.userIdSignal());
    readonly userName = computed(() => this.userNameSignal());
    readonly userEmail = computed(() => this.userEmailSignal());
    readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

    setSession(response: AuthSessionResponse): void {
        this.writeStorage('access_token', response.accessToken);
        this.writeStorage('refresh_token', response.refreshToken);
        this.writeStorage('client_id', response.clientId);
        this.writeStorage('user_id', response.id);
        this.writeStorage('user_name', response.name);
        this.writeStorage('user_email', response.email);

        this.accessTokenSignal.set(response.accessToken);
        this.refreshTokenSignal.set(response.refreshToken);
        this.clientIdSignal.set(response.clientId);
        this.userIdSignal.set(response.id);
        this.userNameSignal.set(response.name);
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

        return localStorage.getItem(key);
    }

    private writeStorage(key: string, value: string): void {
        if (!this.isBrowser) {
            return;
        }

        localStorage.setItem(key, value);
    }

    private removeStorage(key: string): void {
        if (!this.isBrowser) {
            return;
        }

        localStorage.removeItem(key);
    }
}
