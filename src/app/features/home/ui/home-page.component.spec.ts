import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import {
    AccountResponse,
    CategoryResponse,
    MonthBalanceResponse,
    PagedResponse,
    TagResponse,
    TagDetailsResponse,
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
        createTransaction: ReturnType<typeof vi.fn>;
        createTransfer: ReturnType<typeof vi.fn>;
        assignTagCategories: ReturnType<typeof vi.fn>;
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
            getTagById: vi.fn(() =>
                of<TagDetailsResponse>({
                    id: 'tag-id',
                    name: 'Essentials',
                    color: '#23c78b',
                    isDeleted: false,
                    categories: [],
                }),
            ),
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
            createTransaction: vi.fn(() => of('transaction-id')),
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
            assignTagCategories: vi.fn(() => of('tag-id')),
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

    it('renders the authenticated dashboard structure when the user has an account', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'main-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#23c78b',
                        isArchived: false,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('ms-main-header')).not.toBeNull();
        expect(host.querySelector('.period-meta')).toBeNull();
        expect(host.querySelector('ms-main-summary-cards')).not.toBeNull();
        expect(host.querySelector('ms-main-tab-bar')).not.toBeNull();
        expect(host.textContent ?? '').toContain('Транзакции');
    });

    it('blocks the dashboard with first-login setup until the primary account is created', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;
        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.first-account-setup')).not.toBeNull();
        expect(host.querySelector('ms-main-header')).toBeNull();
        expect(host.querySelector('ms-main-summary-cards')).toBeNull();
        expect(host.querySelector('ms-main-tab-bar')).toBeNull();
        expect(host.textContent ?? '').toContain('Создайте основной счёт');

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

    it('sends a backend-ready payload when saving an expense transaction', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'main-account',
                        name: 'Main account',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#23c78b',
                        isArchived: false,
                    },
                ]),
            ),
        );
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
                    {
                        id: 'income-category',
                        name: 'Salary',
                        type: 'Credit',
                        color: '#23c78b',
                    },
                    {
                        id: 'expense-category',
                        name: 'Food',
                        type: 'Debit',
                        color: '#ff8fab',
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.updateTransactionDraft({
            type: 'expense',
            accountId: 'main-account',
            categoryId: 'expense-category',
            amount: 12.35,
            date: '05.06.2026',
            description: '  Lunch  ',
        });
        component.saveTransaction();

        expect(homeApi.createTransaction).toHaveBeenCalledWith({
            accountId: 'main-account',
            categoryId: 'expense-category',
            amount: -12.35,
            date: '2026-06-05',
            description: 'Lunch',
        });
    });

    it('lets the user dismiss a loading error after a short closing animation', () => {
        vi.useFakeTimers();
        homeApi.getAccounts.mockReturnValue(throwError(() => new Error('network')));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const closeButton = host.querySelector<HTMLElement>('[data-testid="dismiss-error"]');

        expect(host.querySelector('.home-alert')).not.toBeNull();
        expect(closeButton).not.toBeNull();

        closeButton?.click();
        fixture.detectChanges();

        expect(host.querySelector('.home-alert--leaving')).not.toBeNull();

        vi.advanceTimersByTime(220);
        fixture.detectChanges();

        expect(host.querySelector('.home-alert')).toBeNull();

        vi.useRealTimers();
    });

    it('refreshes only tag data when assigning a category to a tag', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'main-account',
                        name: 'Main account',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#23c78b',
                        isArchived: false,
                    },
                ]),
            ),
        );
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
                    {
                        id: 'food-id',
                        name: 'Food',
                        type: 'Debit',
                        color: '#ff6f91',
                    },
                ]),
            ),
        );
        homeApi.getTags.mockReturnValue(
            of(page<TagResponse>([{ id: 'tag-id', name: 'Essentials', color: '#23c78b' }])),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialCategoryCalls = homeApi.getCategories.mock.calls.length;
        const initialTransactionCalls = homeApi.getTransactions.mock.calls.length;
        const initialBalanceCalls = homeApi.getMonthBalance.mock.calls.length;
        const initialTagCalls = homeApi.getTags.mock.calls.length;

        fixture.componentInstance.assignCategoryToTag({
            tagId: 'tag-id',
            categoryId: 'food-id',
        });

        expect(homeApi.assignTagCategories).toHaveBeenCalledWith('tag-id', {
            categoryIds: ['food-id'],
        });
        expect(homeApi.getTags.mock.calls.length).toBe(initialTagCalls + 1);
        expect(homeApi.getAccounts.mock.calls.length).toBe(initialAccountCalls);
        expect(homeApi.getCategories.mock.calls.length).toBe(initialCategoryCalls);
        expect(homeApi.getTransactions.mock.calls.length).toBe(initialTransactionCalls);
        expect(homeApi.getMonthBalance.mock.calls.length).toBe(initialBalanceCalls);
    });

    it('clears the session and redirects to auth on logout', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'main-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#23c78b',
                        isArchived: false,
                    },
                ]),
            ),
        );

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
