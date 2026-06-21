import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { AuthSessionResponse } from '../models/auth.models';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { AuthStore } from '../../features/auth/data-access/auth.store';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
    let authStore: {
        isAuthenticated: ReturnType<typeof vi.fn>;
        setSession: ReturnType<typeof vi.fn>;
        clearSession: ReturnType<typeof vi.fn>;
    };
    let authService: {
        refresh: ReturnType<typeof vi.fn>;
    };
    let router: {
        createUrlTree: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        authStore = {
            isAuthenticated: vi.fn(() => false),
            setSession: vi.fn(),
            clearSession: vi.fn(),
        };
        authService = {
            refresh: vi.fn(),
        };
        router = {
            createUrlTree: vi.fn((commands: unknown[]) => ({ commands }) as unknown as UrlTree),
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthStore, useValue: authStore },
                { provide: AuthService, useValue: authService },
                { provide: Router, useValue: router },
            ],
        });
    });

    it('redirects away from auth immediately when a session is already in memory', () => {
        authStore.isAuthenticated.mockReturnValue(true);

        const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

        expect(result).toEqual({ commands: ['/'] });
        expect(authService.refresh).not.toHaveBeenCalled();
    });

    it('restores a cookie session and redirects away from auth', async () => {
        const session: AuthSessionResponse = {
            id: 'user-id',
            name: 'Alex',
            email: 'alex@example.com',
            clientId: 'client-id',
        };
        authService.refresh.mockReturnValue(of(session));

        const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

        await expect(firstValueFrom(result as Observable<boolean | UrlTree>)).resolves.toEqual({
            commands: ['/'],
        });
        expect(authService.refresh).toHaveBeenCalledWith();
        expect(authStore.setSession).toHaveBeenCalledWith(session);
    });

    it('allows auth navigation when cookie session restoration fails', async () => {
        authService.refresh.mockReturnValue(throwError(() => new Error('No cookie')));

        const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

        await expect(firstValueFrom(result as Observable<boolean | UrlTree>)).resolves.toBe(true);
        expect(authStore.clearSession).toHaveBeenCalledOnce();
    });
});
