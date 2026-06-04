import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore } from '../../auth/data-access/auth.store';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
    let fixture: ComponentFixture<HomePageComponent>;
    let authStore: {
        userId: WritableSignal<string | null>;
        clearSession: ReturnType<typeof vi.fn>;
    };
    let router: {
        navigateByUrl: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        authStore = {
            userId: signal('user-123'),
            clearSession: vi.fn(),
        };
        router = {
            navigateByUrl: vi.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [HomePageComponent],
            providers: [
                { provide: AuthStore, useValue: authStore },
                { provide: Router, useValue: router },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
    });

    it('renders the authenticated dashboard structure', () => {
        const host = fixture.nativeElement as HTMLElement;
        const text = host.textContent ?? '';
        const buttons = host.querySelectorAll('ms-button');
        const surfaces = host.querySelectorAll('ms-surface');

        expect(text).toContain('MSaver');
        expect(text).toContain('user-123');
        expect(text).toContain('Финансовый обзор');
        expect(text).toContain('Быстрые действия');
        expect(text).toContain('Последние операции');
        expect(text).toContain('Бюджет');
        expect(buttons.length).toBeGreaterThanOrEqual(4);
        expect(surfaces.length).toBeGreaterThanOrEqual(6);
    });

    it('clears the session and redirects to auth on logout', () => {
        const logoutButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
            '[data-testid="logout-button"]',
        );

        expect(logoutButton).not.toBeNull();

        logoutButton?.click();

        expect(authStore.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
    });
});
