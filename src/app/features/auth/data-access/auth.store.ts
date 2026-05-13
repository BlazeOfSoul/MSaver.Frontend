import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoginResponse } from '../../../core/models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly accessTokenSignal = signal<string | null>(this.readStorage('access_token'));
  private readonly refreshTokenSignal = signal<string | null>(this.readStorage('refresh_token'));
  private readonly userIdSignal = signal<string | null>(this.readStorage('user_id'));

  readonly accessToken = computed(() => this.accessTokenSignal());
  readonly refreshToken = computed(() => this.refreshTokenSignal());
  readonly userId = computed(() => this.userIdSignal());
  readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

  setSession(response: LoginResponse): void {
    this.writeStorage('access_token', response.accessToken);
    this.writeStorage('refresh_token', response.refreshToken);
    this.writeStorage('user_id', response.id);

    this.accessTokenSignal.set(response.accessToken);
    this.refreshTokenSignal.set(response.refreshToken);
    this.userIdSignal.set(response.id);
  }

  clearSession(): void {
    this.removeStorage('access_token');
    this.removeStorage('refresh_token');
    this.removeStorage('user_id');

    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.userIdSignal.set(null);
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
