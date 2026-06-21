import { TestBed } from '@angular/core/testing';
import { AuthSessionResponse } from '../../../core/models/auth.models';
import { AuthStore } from './auth.store';

const session: AuthSessionResponse = {
    id: 'user-id',
    name: 'Alex',
    email: 'alex@example.com',
    clientId: 'client-id',
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

    it('keeps the auth session in memory without writing tokens or user data to browser storage', () => {
        const store = TestBed.inject(AuthStore);

        store.setSession(session);

        expect(store.isAuthenticated()).toBe(true);
        expect(store.clientId()).toBe('client-id');
        expect(store.userId()).toBe('user-id');
        expect(store.userName()).toBe('Alex');
        expect(store.userEmail()).toBe('alex@example.com');

        expect(window.sessionStorage.getItem('access_token')).toBeNull();
        expect(window.sessionStorage.getItem('refresh_token')).toBeNull();
        expect(window.sessionStorage.getItem('client_id')).toBeNull();
        expect(window.sessionStorage.getItem('user_id')).toBeNull();
        expect(window.sessionStorage.getItem('user_name')).toBeNull();
        expect(window.sessionStorage.getItem('user_email')).toBeNull();
        expect(window.localStorage.getItem('access_token')).toBeNull();
        expect(window.localStorage.getItem('refresh_token')).toBeNull();
    });

    it('uses username as the display name when the auth session does not include name', () => {
        const store = TestBed.inject(AuthStore);
        const sessionWithUsername: AuthSessionResponse = {
            id: 'user-id',
            username: 'Alex',
            email: 'alex@example.com',
            clientId: 'client-id',
        };

        store.setSession(sessionWithUsername);

        expect(store.userName()).toBe('Alex');
    });

    it('removes legacy browser storage session values when it starts', () => {
        window.localStorage.setItem('access_token', 'legacy-access-token');
        window.localStorage.setItem('refresh_token', 'legacy-refresh-token');
        window.localStorage.setItem('client_id', 'legacy-client-id');
        window.localStorage.setItem('user_id', 'legacy-user-id');
        window.localStorage.setItem('user_name', 'Legacy User');
        window.localStorage.setItem('user_email', 'legacy@example.com');
        window.sessionStorage.setItem('access_token', 'legacy-access-token');
        window.sessionStorage.setItem('refresh_token', 'legacy-refresh-token');
        window.sessionStorage.setItem('client_id', 'legacy-client-id');
        window.sessionStorage.setItem('user_id', 'legacy-user-id');
        window.sessionStorage.setItem('user_name', 'Legacy User');
        window.sessionStorage.setItem('user_email', 'legacy@example.com');

        const store = TestBed.inject(AuthStore);

        expect(store.isAuthenticated()).toBe(false);
        expect(window.localStorage.getItem('access_token')).toBeNull();
        expect(window.localStorage.getItem('refresh_token')).toBeNull();
        expect(window.localStorage.getItem('client_id')).toBeNull();
        expect(window.localStorage.getItem('user_id')).toBeNull();
        expect(window.localStorage.getItem('user_name')).toBeNull();
        expect(window.localStorage.getItem('user_email')).toBeNull();
        expect(window.sessionStorage.getItem('access_token')).toBeNull();
        expect(window.sessionStorage.getItem('refresh_token')).toBeNull();
        expect(window.sessionStorage.getItem('client_id')).toBeNull();
        expect(window.sessionStorage.getItem('user_id')).toBeNull();
        expect(window.sessionStorage.getItem('user_name')).toBeNull();
        expect(window.sessionStorage.getItem('user_email')).toBeNull();
    });

    it('clears the in-memory session', () => {
        const store = TestBed.inject(AuthStore);

        store.setSession(session);
        store.clearSession();

        expect(store.isAuthenticated()).toBe(false);
        expect(store.clientId()).toBeNull();
        expect(store.userId()).toBeNull();
        expect(store.userName()).toBeNull();
        expect(store.userEmail()).toBeNull();
    });
});
