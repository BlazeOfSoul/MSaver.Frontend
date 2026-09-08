import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService, AuthSessionItem } from '../../../../auth/data-access/auth.service';
import { AuthStore } from '../../../../auth/data-access/auth.store';
import { SessionsPanelComponent } from './sessions-panel.component';

describe('SessionsPanelComponent', () => {
    const current: AuthSessionItem = {
        clientId: 'current',
        createdAt: '2026-09-08T00:00:00Z',
        expiresAt: '2026-10-08T00:00:00Z',
        isCurrent: true,
    };
    const other = { ...current, clientId: 'other', isCurrent: false };
    let api: {
        sessions: ReturnType<typeof vi.fn>;
        revokeSession: ReturnType<typeof vi.fn>;
        logoutAll: ReturnType<typeof vi.fn>;
    };
    let store: { clearSession: ReturnType<typeof vi.fn> };
    let router: { navigateByUrl: ReturnType<typeof vi.fn> };
    beforeEach(() => {
        api = {
            sessions: vi.fn(() => of([current, other])),
            revokeSession: vi.fn(() => of(undefined)),
            logoutAll: vi.fn(() => of(undefined)),
        };
        store = { clearSession: vi.fn() };
        router = { navigateByUrl: vi.fn() };
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: api },
                { provide: AuthStore, useValue: store },
                { provide: Router, useValue: router },
            ],
        });
    });
    it('removes another session without ending the current login', () => {
        const fixture = TestBed.createComponent(SessionsPanelComponent);
        fixture.componentInstance.revoke(other);
        expect(api.revokeSession).toHaveBeenCalledWith('other');
        expect(fixture.componentInstance.sessions()).toEqual([current]);
        expect(store.clearSession).not.toHaveBeenCalled();
    });
    it('clears local session data after logout-all succeeds', () => {
        const fixture = TestBed.createComponent(SessionsPanelComponent);
        fixture.componentInstance.revoke();
        expect(api.logoutAll).toHaveBeenCalledOnce();
        expect(store.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
    });
    it('keeps the current login and sessions visible when revocation fails', () => {
        api.revokeSession.mockReturnValue(throwError(() => new Error('offline')));
        const fixture = TestBed.createComponent(SessionsPanelComponent);
        fixture.componentInstance.revoke(current);
        expect(store.clearSession).not.toHaveBeenCalled();
        expect(fixture.componentInstance.sessions()).toHaveLength(2);
        expect(fixture.componentInstance.error()).toContain('Не удалось');
        expect(fixture.componentInstance.busy()).toBe(false);
    });
});
