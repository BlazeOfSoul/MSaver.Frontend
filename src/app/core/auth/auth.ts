import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { authRequestSchema, authResponseSchema, AuthRequest, AuthResponse } from './models';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ZodError } from 'zod';

const API_LOGIN_PATH = 'auth/login';
const API_LOGOUT_PATH = 'auth/logout';

@Injectable({
    providedIn: 'root',
})
export class Auth {
    private readonly http = inject(HttpClient);
    private readonly platformId = inject(PLATFORM_ID);

    private readonly isBrowser = isPlatformBrowser(this.platformId);

    private readonly accessTokenSignal = signal<string | null>(this.readStorage('access_token'));
    private readonly refreshTokenSignal = signal<string | null>(this.readStorage('refresh_token'));
    private readonly clientId = signal<string | null>(this.readStorage('client_id'));

    readonly accessToken = computed(() => this.accessTokenSignal());
    readonly refreshToken = computed(() => this.refreshTokenSignal());
    readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

    async login(payload: AuthRequest): Promise<ZodError<AuthRequest> | undefined> {
        const validationResult = authRequestSchema.safeParse(payload);

        if (!validationResult.success) {
            return validationResult.error;
        }

        const response = await firstValueFrom(this.http.post(API_LOGIN_PATH, validationResult.data));
        const parsedResponse = authResponseSchema.parse(response);

        this.setSession(parsedResponse);

        return undefined;
    }

    async logout() {
        try {
            return await firstValueFrom(
                this.http.post(API_LOGOUT_PATH, { clientId: this.clientId() }),
            );
        } finally {
            this.clearSession();
        }
    }

    private clearSession(): void {
        this.removeStorage('access_token');
        this.removeStorage('refresh_token');
        this.removeStorage('client_id');

        this.accessTokenSignal.set(null);
        this.refreshTokenSignal.set(null);
        this.clientId.set(null);
    }

    private setSession(response: AuthResponse): void {
        this.writeStorage('access_token', response.accessToken);
        this.writeStorage('refresh_token', response.refreshToken);
        this.writeStorage('client_id', response.clientId);

        this.accessTokenSignal.set(response.accessToken);
        this.refreshTokenSignal.set(response.refreshToken);
        this.clientId.set(response.clientId);
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
