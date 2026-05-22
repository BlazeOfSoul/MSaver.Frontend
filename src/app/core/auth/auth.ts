import { PLATFORM_ID, computed, inject, Injectable, signal, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthRequest, AuthResponse } from './models';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ZodError } from 'zod';

const API_LOGIN_PATH = 'auth/login';
const API_LOGOUT_PATH = 'auth/logout';

@Injectable({
    providedIn: 'root',
})
export class Auth implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly platformId = inject(PLATFORM_ID);

    private readonly isBrowser = isPlatformBrowser(this.platformId);

    private readonly accessTokenSignal = signal<string | null>(this.readStorage('access_token'));
    private readonly refreshTokenSignal = signal<string | null>(this.readStorage('refresh_token'));
    private readonly clientId = signal<string | null>(this.readStorage('client_id'));

    readonly accessToken = computed(() => this.accessTokenSignal());
    readonly refreshToken = computed(() => this.refreshTokenSignal());
    readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

    ngOnInit(): void {
        this.accessTokenSignal.set(this.readStorage('access_token'));
        this.refreshTokenSignal.set(this.readStorage('refresh_token'));
    }

    async login(payload: AuthRequest): Promise<ZodError<AuthRequest> | undefined> {
        return await firstValueFrom(this.http.post<AuthResponse>(API_LOGIN_PATH, payload))
            .then((data) => {
                this.setSession(data);
                return undefined;
            })
            .catch<ZodError<AuthRequest>>((error: ZodError<AuthRequest>) => error);
    }

    async logout() {
        return await firstValueFrom(
            this.http.post(API_LOGOUT_PATH, { clientId: this.clientId() }),
        ).then(() => this.clearSession());
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
        this.writeStorage('client_id', response.refreshToken);

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
