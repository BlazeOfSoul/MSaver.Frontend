import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import {
    AccountResponse,
    CategoryResponse,
    MonthBalanceResponse,
    PagedResponse,
    TagResponse,
    TransactionResponse,
} from '../data-access/home-api.models';
import { HomeApiService } from '../data-access/home-api.service';
import { HomePageComponent } from './home-page.component';

function page<T>(items: T[]): PagedResponse<T> {
    return {
        items,
        page: 1,
        size: 100,
        totalCount: items.length,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
    };
}

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
    let homeApi: {
        getAccounts: ReturnType<typeof vi.fn>;
        getCategories: ReturnType<typeof vi.fn>;
        getTags: ReturnType<typeof vi.fn>;
        getTagById: ReturnType<typeof vi.fn>;
        getTransactions: ReturnType<typeof vi.fn>;
        getMonthBalance: ReturnType<typeof vi.fn>;
        createAccount: ReturnType<typeof vi.fn>;
        createTransfer: ReturnType<typeof vi.fn>;
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
        homeApi = {
            getAccounts: vi.fn(() => of(page<AccountResponse>([]))),
            getCategories: vi.fn(() => of(page<CategoryResponse>([]))),
            getTags: vi.fn(() => of(page<TagResponse>([]))),
            getTagById: vi.fn(),
            getTransactions: vi.fn(() => of(page<TransactionResponse>([]))),
            getMonthBalance: vi.fn((accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: 'Account',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: 0,
                    year,
                    month,
                }),
            ),
            createAccount: vi.fn(() => of('account-id')),
            createTransfer: vi.fn(() =>
                of({
                    expenseTransactionId: 'expense-id',
                    incomeTransactionId: 'income-id',
                    withdrawAmount: 100,
                    depositAmount: 110,
                    rate: 1.1,
                    fromCurrencyCode: 'USD',
                    toCurrencyCode: 'EUR',
                }),
            ),
        };

        await TestBed.configureTestingModule({
            imports: [HomePageComponent],
            providers: [
                { provide: AuthStore, useValue: authStore },
                { provide: AuthService, useValue: authService },
                { provide: HomeApiService, useValue: homeApi },
                { provide: Router, useValue: router },
            ],
        }).compileComponents();
    });

    it('renders the authenticated dashboard structure', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const text = host.textContent ?? '';

        expect(host.querySelector('ms-main-header')).not.toBeNull();
        expect(host.querySelector('ms-main-summary-cards')).not.toBeNull();
        expect(host.querySelector('ms-main-tab-bar')).not.toBeNull();
        expect(text).toContain('Транзакции');
    });

    it('shows first-login setup and creates the primary account with selected currency', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;
        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent).toContain('Создайте основной счёт');

        component.setNewAccountCurrency('USD');
        component.createPrimaryAccount();

        expect(homeApi.createAccount).toHaveBeenCalledWith({
            name: 'Основной счёт',
            currencyCode: 'USD',
            color: '#23c78b',
        });
    });

    it('sends transfer currency rate when accounts use different currencies', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'from-account',
                        name: 'Долларовая карта',
                        currencyCode: 'USD',
                        currentBalance: 500,
                        color: '#23c78b',
                        isArchived: false,
                    },
                    {
                        id: 'to-account',
                        name: 'Евро резерв',
                        currencyCode: 'EUR',
                        currentBalance: 200,
                        color: '#67a6c1',
                        isArchived: false,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.updateTransferDraft({
            fromAccountId: 'from-account',
            toAccountId: 'to-account',
            amount: 100,
            rate: 1.1,
            description: 'Пополнение резерва',
        });
        component.transferBetweenAccounts();

        expect(homeApi.createTransfer).toHaveBeenCalledWith({
            fromAccountId: 'from-account',
            toAccountId: 'to-account',
            amount: 100,
            date: expect.any(String),
            rate: 1.1,
            description: 'Пополнение резерва',
        });
    });

    it('clears the session and redirects to auth on logout', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

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
