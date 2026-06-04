import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { HomeApiService } from '../data-access/home-api.service';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
    let fixture: ComponentFixture<HomePageComponent>;
    let authStore: {
        userId: WritableSignal<string | null>;
        clientId: WritableSignal<string | null>;
        clearSession: ReturnType<typeof vi.fn>;
    };
    let authService: {
        logout: ReturnType<typeof vi.fn>;
    };
    let router: {
        navigateByUrl: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        authStore = {
            userId: signal('user-123'),
            clientId: signal('client-123'),
            clearSession: vi.fn(),
        };
        authService = {
            logout: vi.fn(() => of(undefined)),
        };
        router = {
            navigateByUrl: vi.fn(),
        };
        const emptyPage = { items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 0 };

        await TestBed.configureTestingModule({
            imports: [HomePageComponent],
            providers: [
                { provide: AuthStore, useValue: authStore },
                { provide: AuthService, useValue: authService },
                {
                    provide: HomeApiService,
                    useValue: {
                        getAccounts: vi.fn(() => of(emptyPage)),
                        getCategories: vi.fn(() => of(emptyPage)),
                        getTags: vi.fn(() => of(emptyPage)),
                        getTransactions: vi.fn(() => of(emptyPage)),
                        getMonthBalance: vi.fn(() => of(null)),
                    },
                },
                { provide: Router, useValue: router },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
    });

    it('renders the authenticated dashboard structure', () => {
        const host = fixture.nativeElement as HTMLElement;
        const text = host.textContent ?? '';

        expect(host.querySelector('ms-main-header')).not.toBeNull();
        expect(host.querySelector('ms-main-toolbar')).not.toBeNull();
        expect(host.querySelector('ms-main-summary-cards')).not.toBeNull();
        expect(host.querySelector('ms-main-tab-bar')).not.toBeNull();
        expect(text).toContain('Ð¢Ñ€Ð°Ð½Ð·Ð°ÐºÑ†Ð¸Ð¸');
    });

    it('clears the session and redirects to auth on logout', () => {
        const logoutButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
            '[data-testid="logout-button"]',
        );

        expect(logoutButton).not.toBeNull();

        logoutButton?.click();

        expect(authService.logout).toHaveBeenCalledWith('client-123');
        expect(authStore.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
    });
});
