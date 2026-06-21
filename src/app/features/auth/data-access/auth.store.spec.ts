import { TestBed } from '@angular/core/testing';
import { AuthSessionResponse } from '../../../core/models/auth.models';
import { AuthStore } from './auth.store';

const session: AuthSessionResponse = {
    id: 'user-id',
    name: 'Alex',
    email: 'alex@example.com',
    clientId: 'client-id',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
};

describe('AuthStore', () => {
    beforeEach(() => {
        TestBed.resetTestingModule();
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    it('stores auth session in session storage instead of persistent local storage', () => {
        const store = TestBed.inject(AuthStore);

        store.setSession(session);

        expect(window.sessionStorage.getItem('access_token')).toBe('access-token');
        expect(window.sessionStorage.getItem('refresh_token')).toBe('refresh-token');
        expect(window.localStorage.getItem('access_token')).toBeNull();
        expect(window.localStorage.getItem('refresh_token')).toBeNull();
        expect(store.isAuthenticated()).toBe(true);

        store.clearSession();

        expect(window.sessionStorage.getItem('access_token')).toBeNull();
        expect(window.sessionStorage.getItem('refresh_token')).toBeNull();
        expect(store.isAuthenticated()).toBe(false);
    });

    it('uses username as the display name when the auth session does not include name', () => {
        const store = TestBed.inject(AuthStore);
        const sessionWithUsername: AuthSessionResponse = {
            id: 'user-id',
            username: 'Alex',
            email: 'alex@example.com',
            clientId: 'client-id',
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };

        store.setSession(sessionWithUsername);

        expect(window.sessionStorage.getItem('user_name')).toBe('Alex');
        expect(store.userName()).toBe('Alex');
    });

    it('ignores an undefined display name restored from browser storage', () => {
        window.sessionStorage.setItem('user_name', 'undefined');

        const store = TestBed.inject(AuthStore);

        expect(store.userName()).toBeNull();
    });

    it('migrates legacy local storage sessions into session storage and removes the persistent copy', () => {
        window.localStorage.setItem('access_token', 'legacy-access-token');
        window.localStorage.setItem('refresh_token', 'legacy-refresh-token');
        window.localStorage.setItem('client_id', 'legacy-client-id');
        window.localStorage.setItem('user_id', 'legacy-user-id');
        window.localStorage.setItem('user_name', 'Legacy User');
        window.localStorage.setItem('user_email', 'legacy@example.com');

        const store = TestBed.inject(AuthStore);

        expect(store.accessToken()).toBe('legacy-access-token');
        expect(store.refreshToken()).toBe('legacy-refresh-token');
        expect(window.sessionStorage.getItem('access_token')).toBe('legacy-access-token');
        expect(window.sessionStorage.getItem('refresh_token')).toBe('legacy-refresh-token');
        expect(window.localStorage.getItem('access_token')).toBeNull();
        expect(window.localStorage.getItem('refresh_token')).toBeNull();
    });

    it('keeps the in-memory session usable when browser storage writes are blocked', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('Storage is blocked');
        });

        const store = TestBed.inject(AuthStore);

        expect(() => store.setSession(session)).not.toThrow();
        expect(store.accessToken()).toBe('access-token');
        expect(store.refreshToken()).toBe('refresh-token');
        expect(store.isAuthenticated()).toBe(true);
    });

    it('keeps the in-memory session usable when browser storage access is blocked', () => {
        vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
            throw new Error('Session storage is blocked');
        });
        vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
            throw new Error('Local storage is blocked');
        });

        const store = TestBed.inject(AuthStore);

        expect(store.isAuthenticated()).toBe(false);
        expect(() => store.setSession(session)).not.toThrow();
        expect(() => store.clearSession()).not.toThrow();
        expect(store.isAuthenticated()).toBe(false);
    });
});
