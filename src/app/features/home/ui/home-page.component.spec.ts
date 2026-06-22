import { signal, WritableSignal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import {
    AccountResponse,
    CategoryResponse,
    CurrentUserResponse,
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

function transaction(
    id: string,
    account: AccountResponse,
    category: CategoryResponse,
    amount: number,
): TransactionResponse {
    return {
        id,
        account: {
            id: account.id,
            name: account.name,
            color: account.color,
            currencyCode: account.currencyCode,
            isArchived: account.isArchived,
        },
        category: {
            id: category.id,
            name: category.name,
            color: category.color,
            type: category.type,
        },
        amount,
        date: '2026-06-05T12:00:00',
        description: category.name,
    };
}

function account(overrides: Partial<AccountResponse> = {}): AccountResponse {
    return {
        id: 'main-account',
        name: 'Основной счёт',
        currencyCode: 'BYN',
        currentBalance: 0,
        color: '#23c78b',
        isArchived: false,
        isPrimary: true,
        ...overrides,
    };
}

function summaryCardValue(component: HomePageComponent, id: string): string | undefined {
    return component.summaryCards().find((card) => card.id === id)?.value;
}

describe('HomePageComponent', () => {
    let fixture: ComponentFixture<HomePageComponent>;
    let authStore: {
        userId: WritableSignal<string | null>;
        clientId: WritableSignal<string | null>;
        userName: WritableSignal<string | null>;
        isAuthenticated: WritableSignal<boolean>;
        clearSession: ReturnType<typeof vi.fn>;
    };
    let authService: {
        logout: ReturnType<typeof vi.fn>;
    };
    let homeApi: {
        getAccounts: ReturnType<typeof vi.fn>;
        getCurrentUser: ReturnType<typeof vi.fn>;
        updateApplicationCurrency: ReturnType<typeof vi.fn>;
        getCategories: ReturnType<typeof vi.fn>;
        getTags: ReturnType<typeof vi.fn>;
        getTagById: ReturnType<typeof vi.fn>;
        getTransactions: ReturnType<typeof vi.fn>;
        getMonthBalance: ReturnType<typeof vi.fn>;
        createAccount: ReturnType<typeof vi.fn>;
        deleteAccount: ReturnType<typeof vi.fn>;
        deleteCategory: ReturnType<typeof vi.fn>;
        createCategory: ReturnType<typeof vi.fn>;
        createTag: ReturnType<typeof vi.fn>;
        deleteTag: ReturnType<typeof vi.fn>;
        createTransaction: ReturnType<typeof vi.fn>;
        updateTransaction: ReturnType<typeof vi.fn>;
        deleteTransaction: ReturnType<typeof vi.fn>;
        createTransfer: ReturnType<typeof vi.fn>;
        getTransferRate: ReturnType<typeof vi.fn>;
        assignTagCategories: ReturnType<typeof vi.fn>;
    };
    let router: {
        navigateByUrl: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        window.localStorage.clear();

        authStore = {
            userId: signal('user-123'),
            clientId: signal('client-123'),
            userName: signal('Alex'),
            isAuthenticated: signal(true),
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
            getCurrentUser: vi.fn(() =>
                of<CurrentUserResponse>({
                    id: 'user-123',
                    username: 'Alex',
                    email: 'alex@example.com',
                    applicationCurrencyCode: 'BYN',
                }),
            ),
            updateApplicationCurrency: vi.fn((payload: { applicationCurrencyCode: string }) =>
                of<CurrentUserResponse>({
                    id: 'user-123',
                    username: 'Alex',
                    email: 'alex@example.com',
                    applicationCurrencyCode: payload.applicationCurrencyCode,
                }),
            ),
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
            deleteAccount: vi.fn(() => of('account-id')),
            deleteCategory: vi.fn(() => of('category-id')),
            createCategory: vi.fn(() => of('category-id')),
            createTag: vi.fn(() => of('tag-id')),
            deleteTag: vi.fn(() => of('tag-id')),
            createTransaction: vi.fn(() => of('transaction-id')),
            updateTransaction: vi.fn(() => of('transaction-id')),
            deleteTransaction: vi.fn(() => of('transaction-id')),
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
            getTransferRate: vi.fn(() =>
                of({
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

    it('redirects to auth without loading dashboard data when the session is missing', () => {
        authStore.isAuthenticated.set(false);

        fixture = TestBed.createComponent(HomePageComponent);

        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
        expect(homeApi.getAccounts).not.toHaveBeenCalled();
    });

    it('does not start another full dashboard load while the current one is pending', () => {
        const pendingAccountsPage = new Subject<PagedResponse<AccountResponse>>();
        homeApi.getAccounts.mockReturnValue(pendingAccountsPage.asObservable());

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.isLoading()).toBe(true);

        fixture.componentInstance.reloadDashboard();

        expect(homeApi.getAccounts).toHaveBeenCalledTimes(1);
        expect(homeApi.getCurrentUser).toHaveBeenCalledTimes(1);
        expect(homeApi.getCategories).not.toHaveBeenCalled();

        pendingAccountsPage.next(page<AccountResponse>([]));
        pendingAccountsPage.complete();
    });

    it('blocks the dashboard with first-login setup until the primary account is created', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;
        const host = fixture.nativeElement as HTMLElement;
        const setupBackdrop = host.querySelector<HTMLElement>('.first-account-backdrop');

        expect(setupBackdrop).not.toBeNull();
        expect(setupBackdrop?.querySelector('ms-first-account-setup')).not.toBeNull();
        expect(host.querySelector('.first-account-setup')).not.toBeNull();
        expect(host.querySelector('ms-main-header')).toBeNull();
        expect(host.querySelector('ms-main-summary-cards')).toBeNull();
        expect(host.querySelector('ms-main-tab-bar')).toBeNull();
        expect(host.textContent ?? '').toContain('Создайте основной счёт');

        setupBackdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(host.querySelector('.first-account-setup')).not.toBeNull();

        component.setNewAccountCurrency('USD');
        component.createPrimaryAccount();

        expect(homeApi.createAccount).toHaveBeenCalledWith({
            name: 'Основной счёт',
            currencyCode: 'USD',
            color: '#23c78b',
            initialBalance: 0,
        });
    });

    it('ignores unsupported primary account currency codes', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.setNewAccountCurrency('ZZZ');
        component.createPrimaryAccount();

        expect(homeApi.createAccount).toHaveBeenCalledWith({
            name: 'Основной счёт',
            currencyCode: 'BYN',
            color: '#23c78b',
            initialBalance: 0,
        });
    });

    it('does not load transaction data before the first account exists', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.needsAccountSetup()).toBe(true);
        expect(homeApi.getAccounts).toHaveBeenCalledTimes(1);
        expect(homeApi.getCurrentUser).toHaveBeenCalledTimes(1);
        expect(homeApi.getTransactions).not.toHaveBeenCalled();
        expect(homeApi.getMonthBalance).not.toHaveBeenCalled();
        expect(homeApi.getTransferRate).not.toHaveBeenCalled();
    });

    it('does not reload transaction data from first-login setup when the page size changes', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getTransactions.mockClear();

        fixture.componentInstance.setTransactionPageSize(50);

        expect(window.localStorage.getItem('msaver:overview-transaction-count')).toBe('50');
        expect(homeApi.getTransactions).not.toHaveBeenCalled();
    });

    it('does not load period transaction data before the first account exists', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-12-11T12:00:00'));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getTransactions.mockClear();
        homeApi.getMonthBalance.mockClear();

        fixture.componentInstance.goToNextMonth();

        expect(fixture.componentInstance.needsAccountSetup()).toBe(true);
        expect(homeApi.getTransactions).not.toHaveBeenCalled();
        expect(homeApi.getMonthBalance).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('refreshes account data after first-login account creation without reloading current user', () => {
        const primaryAccount: AccountResponse = {
            id: 'primary-account',
            name: 'Основной счёт',
            currencyCode: 'USD',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };

        homeApi.getAccounts
            .mockReturnValueOnce(of(page<AccountResponse>([])))
            .mockReturnValueOnce(of(page<AccountResponse>([primaryAccount])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;
        const initialUserCalls = homeApi.getCurrentUser.mock.calls.length;

        component.setNewAccountCurrency('USD');
        component.createPrimaryAccount();

        expect(homeApi.createAccount).toHaveBeenCalledWith({
            name: 'Основной счёт',
            currencyCode: 'USD',
            color: '#23c78b',
            initialBalance: 0,
        });
        expect(homeApi.getAccounts.mock.calls.length).toBeGreaterThan(1);
        expect(homeApi.getCurrentUser).toHaveBeenCalledTimes(initialUserCalls);
        expect(component.accounts().map((account) => account.id)).toEqual(['primary-account']);

        expect(component.applicationCurrencyCode()).toBe('USD');

        component.setActiveTab('settings');
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain('USD');
    });

    it('ignores stale dashboard payloads after creating the primary account during initial load', () => {
        const pendingInitialAccounts = new Subject<PagedResponse<AccountResponse>>();
        const primaryAccount: AccountResponse = {
            id: 'primary-account',
            name: 'Основной счёт',
            currencyCode: 'BYN',
            currentBalance: 100,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };

        homeApi.getAccounts
            .mockReturnValueOnce(pendingInitialAccounts.asObservable())
            .mockReturnValueOnce(of(page<AccountResponse>([primaryAccount])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.createPrimaryAccount();

        expect(component.needsAccountSetup()).toBe(false);
        expect(component.accounts().map((account) => account.id)).toEqual(['primary-account']);

        pendingInitialAccounts.next(page<AccountResponse>([]));
        pendingInitialAccounts.complete();

        expect(component.needsAccountSetup()).toBe(false);
        expect(component.accounts().map((account) => account.id)).toEqual(['primary-account']);
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

    it('does not send a transfer between different currencies until a rate exists', () => {
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) =>
            fromAccountId === 'from-account' && toAccountId === 'to-account'
                ? throwError(() => new Error('Rate unavailable'))
                : of({
                      rate: 0.9,
                      fromCurrencyCode: 'EUR',
                      toCurrencyCode: 'USD',
                  }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'from-account',
                        name: 'USD card',
                        currencyCode: 'USD',
                        currentBalance: 500,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'to-account',
                        name: 'EUR reserve',
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

        fixture.componentInstance.updateTransferDraft({
            fromAccountId: 'from-account',
            toAccountId: 'to-account',
            amount: 100,
            rate: null,
            description: 'Reserve top-up',
        });
        expect(fixture.componentInstance.accounts().map((account) => account.id)).toEqual([
            'from-account',
            'to-account',
        ]);
        expect(fixture.componentInstance.transferDraft().rate).toBeNull();

        fixture.componentInstance.transferBetweenAccounts();

        expect(homeApi.createTransfer).not.toHaveBeenCalled();
    });

    it('does not send a transfer when the amount is not a positive finite number', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'from-account',
                        name: 'USD card',
                        currencyCode: 'USD',
                        currentBalance: 500,
                        color: '#23c78b',
                        isArchived: false,
                    },
                    {
                        id: 'to-account',
                        name: 'EUR reserve',
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

        [-100, Number.NaN, Number.POSITIVE_INFINITY].forEach((amount) => {
            fixture.componentInstance.updateTransferDraft({
                fromAccountId: 'from-account',
                toAccountId: 'to-account',
                amount,
                rate: 1.1,
                description: 'Reserve top-up',
            });
            fixture.componentInstance.transferBetweenAccounts();
        });

        expect(homeApi.createTransfer).not.toHaveBeenCalled();
    });

    it('refreshes transaction data after transfer without reloading static dashboard data', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'from-account',
                        name: 'USD card',
                        currencyCode: 'USD',
                        currentBalance: 500,
                        color: '#23c78b',
                        isArchived: false,
                    },
                    {
                        id: 'to-account',
                        name: 'EUR reserve',
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

        fixture.componentInstance.updateTransferDraft({
            fromAccountId: 'from-account',
            toAccountId: 'to-account',
            amount: 100,
            rate: 1.1,
            description: 'Reserve top-up',
        });

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialCurrentUserCalls = homeApi.getCurrentUser.mock.calls.length;
        const initialCategoryCalls = homeApi.getCategories.mock.calls.length;
        const initialTransactionCalls = homeApi.getTransactions.mock.calls.length;
        const initialBalanceCalls = homeApi.getMonthBalance.mock.calls.length;

        fixture.componentInstance.transferBetweenAccounts();

        expect(homeApi.createTransfer).toHaveBeenCalled();
        expect(homeApi.getTransactions.mock.calls.length).toBe(initialTransactionCalls + 2);
        expect(homeApi.getMonthBalance.mock.calls.length).toBe(initialBalanceCalls + 2);
        expect(homeApi.getAccounts.mock.calls.length).toBe(initialAccountCalls);
        expect(homeApi.getCurrentUser.mock.calls.length).toBe(initialCurrentUserCalls);
        expect(homeApi.getCategories.mock.calls.length).toBe(initialCategoryCalls);
    });

    it('loads 25 latest transactions by default for the overview journal', () => {
        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account()])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, size: 25 }),
        );
    });

    it('loads the next backend transaction page from the overview pagination', () => {
        const mainAccount = account();
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff6f91',
        };
        const firstTransaction = {
            ...transaction('first-page-transaction', mainAccount, expenseCategory, -10),
            description: 'First page transaction',
        };
        const secondTransaction = {
            ...transaction('second-page-transaction', mainAccount, expenseCategory, -20),
            description: 'Second page transaction',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));
        homeApi.getTransactions.mockImplementation((query: { page?: number; size?: number }) => {
            if (query.size !== undefined && query.page === 1) {
                return of<PagedResponse<TransactionResponse>>({
                    ...page([firstTransaction]),
                    page: 1,
                    size: 25,
                    totalCount: 2,
                    totalPages: 2,
                    hasPreviousPage: false,
                    hasNextPage: true,
                });
            }

            if (query.size !== undefined && query.page === 2) {
                return of<PagedResponse<TransactionResponse>>({
                    ...page([secondTransaction]),
                    page: 2,
                    size: 25,
                    totalCount: 2,
                    totalPages: 2,
                    hasPreviousPage: true,
                    hasNextPage: false,
                });
            }

            return of(page<TransactionResponse>([]));
        });

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.pagination__meta')?.textContent ?? '').toContain('1 / 2');

        host.querySelector<HTMLButtonElement>('[data-testid="next-transactions-page"]')?.click();
        fixture.detectChanges();

        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ page: 2, size: 25 }),
        );
        expect(host.textContent ?? '').toContain('Second page transaction');
        expect(host.textContent ?? '').not.toContain('First page transaction');
        expect(host.querySelector('.pagination__meta')?.textContent ?? '').toContain('2 / 2');

        host.querySelector<HTMLButtonElement>(
            '[data-testid="previous-transactions-page"]',
        )?.click();
        fixture.detectChanges();

        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, size: 25 }),
        );
        expect(host.textContent ?? '').toContain('First page transaction');
        expect(host.textContent ?? '').not.toContain('Second page transaction');
        expect(host.querySelector('.pagination__meta')?.textContent ?? '').toContain('1 / 2');
    });

    it('loads additional paged transaction data sequentially', () => {
        const pendingSecondYearPage = new Subject<PagedResponse<TransactionResponse>>();
        const pendingThirdYearPage = new Subject<PagedResponse<TransactionResponse>>();
        const wasYearPageRequested = (pageNumber: number) =>
            homeApi.getTransactions.mock.calls.some(([query]) => {
                const transactionQuery = query as { page?: number; size?: number };

                return transactionQuery.page === pageNumber && transactionQuery.size === undefined;
            });

        homeApi.getTransactions.mockImplementation(
            (query: { page?: number; size?: number; fromDate: string; toDate: string }) => {
                if (query.size !== undefined) {
                    return of(page<TransactionResponse>([]));
                }

                if (query.page === 1) {
                    return of({
                        ...page<TransactionResponse>([]),
                        totalCount: 3,
                        totalPages: 3,
                        hasNextPage: true,
                    });
                }

                if (query.page === 2) {
                    return pendingSecondYearPage.asObservable();
                }

                if (query.page === 3) {
                    return pendingThirdYearPage.asObservable();
                }

                return of(page<TransactionResponse>([]));
            },
        );
        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account()])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(wasYearPageRequested(2)).toBe(true);
        expect(wasYearPageRequested(3)).toBe(false);

        pendingSecondYearPage.next(page<TransactionResponse>([]));
        pendingSecondYearPage.complete();

        expect(wasYearPageRequested(3)).toBe(true);

        pendingThirdYearPage.next(page<TransactionResponse>([]));
        pendingThirdYearPage.complete();
    });

    it('loads the remembered transaction count for the overview journal', () => {
        window.localStorage.setItem('msaver:overview-transaction-count', '50');
        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account()])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, size: 50 }),
        );
    });

    it('persists transaction count changes and reloads the overview journal', () => {
        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account()])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getTransactions.mockClear();

        fixture.componentInstance.setTransactionPageSize(100);

        expect(window.localStorage.getItem('msaver:overview-transaction-count')).toBe('100');
        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, size: 100 }),
        );
    });

    it('does not load tag details during the initial overview load', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getTags).not.toHaveBeenCalled();
        expect(homeApi.getTagById).not.toHaveBeenCalled();
    });

    it('does not load categories during the initial overview load', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getCategories).not.toHaveBeenCalled();
    });

    it('loads transfer rates for the transfer form only after opening accounts', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    account({ id: 'byn-account', currencyCode: 'BYN', isPrimary: true }),
                    account({ id: 'usd-account', currencyCode: 'USD', isPrimary: false }),
                ]),
            ),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) =>
            of({
                rate: fromAccountId === 'usd-account' && toAccountId === 'byn-account' ? 3 : 0.33,
                fromCurrencyCode: fromAccountId === 'usd-account' ? 'USD' : 'BYN',
                toCurrencyCode: toAccountId === 'usd-account' ? 'USD' : 'BYN',
            }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getTransferRate).toHaveBeenCalledTimes(1);
        expect(homeApi.getTransferRate).toHaveBeenCalledWith('usd-account', 'byn-account');
        expect(homeApi.getTransferRate).not.toHaveBeenCalledWith('byn-account', 'usd-account');

        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.setActiveTab('accounts');

        expect(homeApi.getTransferRate).toHaveBeenCalledTimes(1);
        expect(homeApi.getTransferRate).toHaveBeenCalledWith('byn-account', 'usd-account');
        expect(fixture.componentInstance.transferDraft().rate).toBe(0.33);
    });

    it('loads categories when the transaction dialog opens from overview', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getCategories.mockClear();

        fixture.componentInstance.startAddingTransaction();

        expect(homeApi.getCategories).toHaveBeenCalledTimes(1);
    });

    it('shows the selected transaction account currency in the transaction dialog', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    account({
                        id: 'usd-account',
                        name: 'USD account',
                        currencyCode: 'USD',
                        isPrimary: true,
                    }),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.startAddingTransaction();
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const suffix = host.querySelector<HTMLElement>('.dialog__amount-currency');

        expect(suffix?.textContent?.trim()).toBe('USD');
    });

    it('keeps the user primary account first in transaction options and selects it by default', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'reserve-account',
                        name: 'Резерв',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#67a6c1',
                        isArchived: false,
                    },
                    {
                        id: 'primary-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#23c78b',
                        isArchived: false,
                    },
                    {
                        id: 'alpha-account',
                        name: 'Альфа',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#e8b45d',
                        isArchived: false,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        expect(component.accountOptions().map((option) => option.value)).toEqual([
            'primary-account',
            'alpha-account',
            'reserve-account',
        ]);

        component.startAddingTransaction();

        expect(component.transactionDraft().accountId).toBe('primary-account');
    });

    it('loads categories when a category-backed tab is opened', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getCategories.mockClear();

        fixture.componentInstance.setActiveTab('categories');

        expect(homeApi.getCategories).toHaveBeenCalledTimes(1);
    });

    it('falls back from unsafe category option colors returned by the backend', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
                    {
                        id: 'food-id',
                        name: 'Food',
                        type: 'Debit',
                        color: 'url(https://example.test/tracker)',
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setActiveTab('categories');

        expect(fixture.componentInstance.allCategoryOptions()[0]?.color).toBe('#23c78b');
    });

    it('loads tag details once when a tag-backed tab is opened', () => {
        homeApi.getTags.mockReturnValue(
            of(page<TagResponse>([{ id: 'tag-id', name: 'Essentials', color: '#23c78b' }])),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getTags).not.toHaveBeenCalled();

        fixture.componentInstance.setActiveTab('categories');
        fixture.componentInstance.setActiveTab('analytics');

        expect(homeApi.getTags).toHaveBeenCalledTimes(1);
        expect(homeApi.getTagById).toHaveBeenCalledTimes(1);
    });

    it('loads tag details sequentially instead of starting every tag detail request at once', () => {
        const firstTagDetails$ = new Subject<TagDetailsResponse>();
        homeApi.getTags.mockReturnValue(
            of(
                page<TagResponse>([
                    { id: 'first-tag', name: 'Essentials', color: '#23c78b' },
                    { id: 'second-tag', name: 'Subscriptions', color: '#e8b45d' },
                ]),
            ),
        );
        homeApi.getTagById.mockImplementation((tagId: string) => {
            if (tagId === 'first-tag') {
                return firstTagDetails$.asObservable();
            }

            return of<TagDetailsResponse>({
                id: 'second-tag',
                name: 'Subscriptions',
                color: '#e8b45d',
                isDeleted: false,
                categories: [],
            });
        });

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setActiveTab('categories');

        expect(homeApi.getTagById).toHaveBeenCalledTimes(1);
        expect(homeApi.getTagById).toHaveBeenCalledWith('first-tag');

        firstTagDetails$.next({
            id: 'first-tag',
            name: 'Essentials',
            color: '#23c78b',
            isDeleted: false,
            categories: [],
        });
        firstTagDetails$.complete();

        expect(homeApi.getTagById).toHaveBeenCalledTimes(2);
        expect(homeApi.getTagById).toHaveBeenCalledWith('second-tag');
        expect(fixture.componentInstance.tagGroups().map((tag) => tag.id)).toEqual([
            'first-tag',
            'second-tag',
        ]);
    });

    it('refreshes tag details after an in-flight tag load finishes when tags changed meanwhile', () => {
        const pendingTagPage = new Subject<PagedResponse<TagResponse>>();
        homeApi.getTags.mockReturnValueOnce(pendingTagPage.asObservable()).mockReturnValueOnce(
            of(
                page<TagResponse>([
                    { id: 'tag-id', name: 'Essentials', color: '#23c78b' },
                    { id: 'new-tag-id', name: 'Subscriptions', color: '#e8b45d' },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setActiveTab('categories');
        fixture.componentInstance.setNewTagGroup('Subscriptions');
        fixture.componentInstance.setNewTagGroupColor('#e8b45d');
        fixture.componentInstance.addTagGroup();

        expect(homeApi.createTag).toHaveBeenCalledWith({
            name: 'Subscriptions',
            color: '#e8b45d',
        });
        expect(homeApi.getTags).toHaveBeenCalledTimes(1);

        pendingTagPage.next(
            page<TagResponse>([{ id: 'tag-id', name: 'Essentials', color: '#23c78b' }]),
        );
        pendingTagPage.complete();

        expect(homeApi.getTags).toHaveBeenCalledTimes(2);
    });

    it('loads only selected month balances during the initial overview load', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-11T12:00:00'));
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
                        isPrimary: true,
                    },
                    {
                        id: 'secondary-account',
                        name: 'Card',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getMonthBalance).toHaveBeenCalledTimes(2);
        expect(homeApi.getMonthBalance).toHaveBeenCalledWith('main-account', 2026, 6);
        expect(homeApi.getMonthBalance).toHaveBeenCalledWith('secondary-account', 2026, 6);

        vi.useRealTimers();
    });

    it('loads selected month balances sequentially during the initial overview load', () => {
        const firstBalance$ = new Subject<MonthBalanceResponse>();
        const accounts: AccountResponse[] = [
            {
                id: 'main-account',
                name: 'Main account',
                currencyCode: 'BYN',
                currentBalance: 0,
                color: '#23c78b',
                isArchived: false,
                isPrimary: true,
            },
            {
                id: 'secondary-account',
                name: 'Card',
                currencyCode: 'BYN',
                currentBalance: 0,
                color: '#67a6c1',
                isArchived: false,
                isPrimary: false,
            },
        ];

        homeApi.getAccounts.mockReturnValue(of(page(accounts)));
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) => {
                if (accountId === 'main-account') {
                    return firstBalance$.asObservable();
                }

                return of<MonthBalanceResponse>({
                    accountId,
                    accountName: 'Card',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: 20,
                    year,
                    month,
                });
            },
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getMonthBalance).toHaveBeenCalledTimes(1);
        expect(homeApi.getMonthBalance).toHaveBeenCalledWith(
            'main-account',
            expect.any(Number),
            expect.any(Number),
        );

        firstBalance$.next({
            accountId: 'main-account',
            accountName: 'Main account',
            currencyCode: 'BYN',
            openingBalance: 0,
            monthChange: 0,
            closingBalance: 10,
            year: 2026,
            month: 6,
        });
        firstBalance$.complete();

        expect(homeApi.getMonthBalance).toHaveBeenCalledTimes(2);
        expect(homeApi.getMonthBalance).toHaveBeenCalledWith(
            'secondary-account',
            expect.any(Number),
            expect.any(Number),
        );
    });

    it('loads missing year balances when analytics is opened', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-11T12:00:00'));
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
                        isPrimary: true,
                    },
                    {
                        id: 'secondary-account',
                        name: 'Card',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getMonthBalance.mockClear();

        fixture.componentInstance.setActiveTab('analytics');

        expect(homeApi.getMonthBalance).toHaveBeenCalledTimes(22);
        expect(homeApi.getMonthBalance).not.toHaveBeenCalledWith('main-account', 2026, 6);
        expect(homeApi.getMonthBalance).not.toHaveBeenCalledWith('secondary-account', 2026, 6);
        expect(homeApi.getMonthBalance).toHaveBeenCalledWith('main-account', 2026, 1);
        expect(homeApi.getMonthBalance).toHaveBeenCalledWith('secondary-account', 2026, 12);

        vi.useRealTimers();
    });

    it('falls back from unsafe analytics category row colors returned by the backend', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-11T12:00:00'));

        const mainAccount = account();
        const expenseCategory: CategoryResponse = {
            id: 'food-id',
            name: 'Food',
            type: 'Debit',
            color: 'linear-gradient(red, blue)',
        };

        homeApi.getAccounts.mockReturnValue(of(page([mainAccount])));
        homeApi.getCategories.mockReturnValue(of(page([expenseCategory])));
        homeApi.getTransactions.mockReturnValue(
            of(page([transaction('expense-id', mainAccount, expenseCategory, -42)])),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setActiveTab('analytics');

        expect(fixture.componentInstance.categoryMonthTable().expenseRows[0]?.color).toBe(
            '#23c78b',
        );

        vi.useRealTimers();
    });

    it('loads the next selected year balances even when the previous year is still loading', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-12-11T12:00:00'));

        const pendingJanuary2026Balance = new Subject<MonthBalanceResponse>();
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) => {
                const response: MonthBalanceResponse = {
                    accountId,
                    accountName: 'Main account',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: 0,
                    year,
                    month,
                };

                if (year === 2026 && month === 1) {
                    return pendingJanuary2026Balance.asObservable();
                }

                return of(response);
            },
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getMonthBalance.mockClear();

        fixture.componentInstance.setActiveTab('analytics');

        expect(homeApi.getMonthBalance).toHaveBeenCalledWith('main-account', 2026, 1);

        fixture.componentInstance.goToNextMonth();

        expect(homeApi.getMonthBalance).toHaveBeenCalledWith('main-account', 2027, 1);

        pendingJanuary2026Balance.next({
            accountId: 'main-account',
            accountName: 'Main account',
            currencyCode: 'BYN',
            openingBalance: 0,
            monthChange: 0,
            closingBalance: 0,
            year: 2026,
            month: 1,
        });
        pendingJanuary2026Balance.complete();

        vi.useRealTimers();
    });

    it('keeps the newest selected-year transactions when year responses resolve out of order', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-12-11T12:00:00'));

        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Groceries',
            type: 'Debit',
            color: '#ff6f91',
        };
        const pendingYear2027Transactions = new Subject<PagedResponse<TransactionResponse>>();
        const year2026Transaction = transaction('year-2026-expense', account, expenseCategory, -20);
        const staleYear2027Transaction = {
            ...transaction('year-2027-expense', account, expenseCategory, -999),
            date: '2027-06-05T12:00:00',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getTransactions.mockImplementation(
            (query: { fromDate: string; toDate: string; page?: number }) => {
                if (query.fromDate === '2027-01-01' && query.toDate === '2028-01-01') {
                    return pendingYear2027Transactions.asObservable();
                }

                if (query.fromDate === '2026-01-01' && query.toDate === '2027-01-01') {
                    return of(page<TransactionResponse>([year2026Transaction]));
                }

                return of(page<TransactionResponse>([]));
            },
        );

        fixture.componentInstance.goToNextMonth();
        fixture.componentInstance.goToPreviousMonth();

        expect(
            fixture.componentInstance.monthlyExpensesChart().some((point) => point.value === 20),
        ).toBe(true);

        pendingYear2027Transactions.next(page<TransactionResponse>([staleYear2027Transaction]));
        pendingYear2027Transactions.complete();

        expect(
            fixture.componentInstance.monthlyExpensesChart().some((point) => point.value === 20),
        ).toBe(true);

        vi.useRealTimers();
    });

    it('reloads only the current transaction page when the account filter changes', () => {
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
                        isPrimary: true,
                    },
                    {
                        id: 'secondary-account',
                        name: 'Card',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getAccounts.mockClear();
        homeApi.getCurrentUser.mockClear();
        homeApi.getCategories.mockClear();
        homeApi.getTags.mockClear();
        homeApi.getTagById.mockClear();
        homeApi.getMonthBalance.mockClear();
        homeApi.getTransferRate.mockClear();
        homeApi.getTransactions.mockClear();

        fixture.componentInstance.setAccountFilter('secondary-account');

        expect(homeApi.getTransactions).toHaveBeenCalledTimes(1);
        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({
                accountId: 'secondary-account',
                page: 1,
                size: 25,
            }),
        );
        expect(homeApi.getAccounts).not.toHaveBeenCalled();
        expect(homeApi.getCurrentUser).not.toHaveBeenCalled();
        expect(homeApi.getCategories).not.toHaveBeenCalled();
        expect(homeApi.getTags).not.toHaveBeenCalled();
        expect(homeApi.getTagById).not.toHaveBeenCalled();
        expect(homeApi.getMonthBalance).not.toHaveBeenCalled();
        expect(homeApi.getTransferRate).not.toHaveBeenCalled();
    });

    it('ignores unknown account filters without reloading transactions', () => {
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
                        isPrimary: true,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getTransactions.mockClear();

        fixture.componentInstance.setAccountFilter('missing-account');

        expect(fixture.componentInstance.selectedAccountId()).toBe('all');
        expect(homeApi.getTransactions).not.toHaveBeenCalled();
    });

    it('keeps analytics account selection separate from overview and accounts filters', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    account({ id: 'main-account', name: 'Main account', isPrimary: true }),
                    account({
                        id: 'usd-account',
                        name: 'USD card',
                        currencyCode: 'USD',
                        isPrimary: false,
                    }),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getTransactions.mockClear();

        fixture.componentInstance.setAnalyticsAccountFilter('usd-account');

        expect(fixture.componentInstance.analyticsSelectedAccountId()).toBe('usd-account');
        expect(fixture.componentInstance.selectedAccountId()).toBe('all');
        expect(fixture.componentInstance.accountsSelectedAccountId()).toBe('all');
        expect(homeApi.getTransactions).not.toHaveBeenCalled();
    });

    it('calculates monthly income and expenses from the full period instead of the current page', () => {
        const mainAccount = account({ id: 'main-account', name: 'Main account' });
        const salaryCategory: CategoryResponse = {
            id: 'salary',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };
        const foodCategory: CategoryResponse = {
            id: 'food',
            name: 'Food',
            type: 'Debit',
            color: '#ff6f91',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getTransactions.mockImplementation(
            (query: { size?: number; fromDate: string; toDate: string }) => {
                if (query.size) {
                    return of(
                        page([transaction('visible-income', mainAccount, salaryCategory, 100)]),
                    );
                }

                return of(
                    page([
                        transaction('visible-income', mainAccount, salaryCategory, 100),
                        transaction('period-expense', mainAccount, foodCategory, -40),
                        transaction('next-page-expense', mainAccount, foodCategory, -60),
                    ]),
                );
            },
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const cards = fixture.componentInstance.summaryCards();
        const income = cards.find((card) => card.id === 'income');
        const expense = cards.find((card) => card.id === 'expense');

        expect(income?.value).toContain('100');
        expect(expense?.value).toContain('100');
    });

    it('splits monthly totals by amount sign when an expense category type is inconsistent', () => {
        const mainAccount = account({ id: 'main-account', name: 'Main account' });
        const salaryCategory: CategoryResponse = {
            id: 'salary',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };
        const inconsistentExpenseCategory: CategoryResponse = {
            id: 'food',
            name: 'Food',
            type: 'Credit',
            color: '#ff6f91',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getTransactions.mockImplementation(
            (query: { size?: number; fromDate: string; toDate: string }) => {
                const transactions = [
                    transaction('salary', mainAccount, salaryCategory, 100),
                    transaction('debt-given', mainAccount, inconsistentExpenseCategory, -12),
                    transaction('food', mainAccount, inconsistentExpenseCategory, -15),
                ];

                return of(page(query.size ? transactions.slice(0, 1) : transactions));
            },
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const cards = fixture.componentInstance.summaryCards();
        const income = cards.find((card) => card.id === 'income');
        const expense = cards.find((card) => card.id === 'expense');

        expect(income?.value).toContain('100');
        expect(income?.value).not.toContain('127');
        expect(expense?.value).toContain('27');
    });

    it('does not count account transfers as monthly income or expenses', () => {
        const mainAccount = account({ id: 'main-account', name: 'Main account' });
        const savingsAccount = account({
            id: 'savings-account',
            name: 'Savings account',
            isPrimary: false,
        });
        const salaryCategory: CategoryResponse = {
            id: 'salary',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };
        const foodCategory: CategoryResponse = {
            id: 'food',
            name: 'Food',
            type: 'Debit',
            color: '#ff6f91',
        };
        const transferIncomeCategory: CategoryResponse = {
            id: 'transfer-income',
            name: 'Transfer in',
            type: 'TransferIncome',
            color: '#95a5a6',
        };
        const transferExpenseCategory: CategoryResponse = {
            id: 'transfer-expense',
            name: 'Transfer out',
            type: 'TransferExpense',
            color: '#95a5a6',
        };

        homeApi.getAccounts.mockReturnValue(
            of(page<AccountResponse>([mainAccount, savingsAccount])),
        );
        homeApi.getTransactions.mockReturnValue(
            of(
                page([
                    transaction('salary', mainAccount, salaryCategory, 100),
                    transaction('food', mainAccount, foodCategory, -40),
                    transaction('transfer-out', mainAccount, transferExpenseCategory, -250),
                    transaction('transfer-in', savingsAccount, transferIncomeCategory, 250),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(summaryCardValue(fixture.componentInstance, 'income')).toContain('100');
        expect(summaryCardValue(fixture.componentInstance, 'income')).not.toContain('350');
        expect(summaryCardValue(fixture.componentInstance, 'expense')).toContain('40');
        expect(summaryCardValue(fixture.componentInstance, 'expense')).not.toContain('290');
    });

    it('does not count account transfers in analytics income and expense metrics', () => {
        const mainAccount = account({ id: 'main-account', name: 'Main account' });
        const savingsAccount = account({
            id: 'savings-account',
            name: 'Savings account',
            isPrimary: false,
        });
        const salaryCategory: CategoryResponse = {
            id: 'salary',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };
        const foodCategory: CategoryResponse = {
            id: 'food',
            name: 'Food',
            type: 'Debit',
            color: '#ff6f91',
        };
        const transferIncomeCategory: CategoryResponse = {
            id: 'transfer-income',
            name: 'Transfer in',
            type: 'TransferIncome',
            color: '#95a5a6',
        };
        const transferExpenseCategory: CategoryResponse = {
            id: 'transfer-expense',
            name: 'Transfer out',
            type: 'TransferExpense',
            color: '#95a5a6',
        };

        homeApi.getAccounts.mockReturnValue(
            of(page<AccountResponse>([mainAccount, savingsAccount])),
        );
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
                    salaryCategory,
                    foodCategory,
                    transferIncomeCategory,
                    transferExpenseCategory,
                ]),
            ),
        );
        homeApi.getTransactions.mockImplementation(
            (query: { size?: number; fromDate: string; toDate: string }) => {
                const transactions = [
                    transaction('salary', mainAccount, salaryCategory, 100),
                    transaction('food', mainAccount, foodCategory, -40),
                    transaction('transfer-out', mainAccount, transferExpenseCategory, -250),
                    transaction('transfer-in', savingsAccount, transferIncomeCategory, 250),
                ];

                return of(page(query.size ? transactions.slice(0, 2) : transactions));
            },
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        fixture.componentInstance.setActiveTab('analytics');

        const income = fixture.componentInstance
            .analyticsMetrics()
            .find((metric) => metric.id === 'metric-income');
        const expense = fixture.componentInstance
            .analyticsMetrics()
            .find((metric) => metric.id === 'metric-expense');

        expect(income?.value).toContain('100');
        expect(income?.value).not.toContain('350');
        expect(expense?.value).toContain('40');
        expect(expense?.value).not.toContain('290');
        expect(
            fixture.componentInstance.monthlyExpensesChart().some((point) => point.value === 290),
        ).toBe(false);
        expect(
            fixture.componentInstance.categoryMonthTable().incomeRows.map((row) => row.id),
        ).not.toContain('transfer-income');
        expect(
            fixture.componentInstance.categoryMonthTable().expenseRows.map((row) => row.id),
        ).not.toContain('transfer-expense');
    });

    it('does not count debt transactions as monthly income or expenses', () => {
        const mainAccount = account({ id: 'main-account', name: 'Main account' });
        const salaryCategory: CategoryResponse = {
            id: 'salary',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };
        const foodCategory: CategoryResponse = {
            id: 'food',
            name: 'Food',
            type: 'Debit',
            color: '#ff6f91',
        };
        const debtTakenCategory: CategoryResponse = {
            id: 'debt-taken',
            name: 'Взято в долг (+)',
            type: 'Credit',
            color: '#23c78b',
            isSystem: true,
        };
        const debtReturnedCategory: CategoryResponse = {
            id: 'debt-returned',
            name: 'Возвращено по долгу (-)',
            type: 'Debit',
            color: '#ff6f91',
            isSystem: true,
        };
        const debtGivenCategory: CategoryResponse = {
            id: 'debt-given',
            name: 'Дано в долг (-)',
            type: 'Debit',
            color: '#e8b45d',
            isSystem: true,
        };
        const debtReceivedCategory: CategoryResponse = {
            id: 'debt-received',
            name: 'Получено по долгу (+)',
            type: 'Credit',
            color: '#67a6c1',
            isSystem: true,
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
                    salaryCategory,
                    foodCategory,
                    debtTakenCategory,
                    debtReturnedCategory,
                    debtGivenCategory,
                    debtReceivedCategory,
                ]),
            ),
        );
        homeApi.getTransactions.mockReturnValue(
            of(
                page([
                    transaction('salary', mainAccount, salaryCategory, 100),
                    transaction('food', mainAccount, foodCategory, -40),
                    transaction('debt-taken', mainAccount, debtTakenCategory, 300),
                    transaction('debt-returned', mainAccount, debtReturnedCategory, -100),
                    transaction('debt-given', mainAccount, debtGivenCategory, -200),
                    transaction('debt-received', mainAccount, debtReceivedCategory, 50),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(summaryCardValue(fixture.componentInstance, 'income')).toContain('100');
        expect(summaryCardValue(fixture.componentInstance, 'income')).not.toContain('450');
        expect(summaryCardValue(fixture.componentInstance, 'expense')).toContain('40');
        expect(summaryCardValue(fixture.componentInstance, 'expense')).not.toContain('340');

        fixture.componentInstance.setActiveTab('analytics');

        const income = fixture.componentInstance
            .analyticsMetrics()
            .find((metric) => metric.id === 'metric-income');
        const expense = fixture.componentInstance
            .analyticsMetrics()
            .find((metric) => metric.id === 'metric-expense');

        expect(income?.value).toContain('100');
        expect(expense?.value).toContain('40');
        expect(
            fixture.componentInstance.monthlyExpensesChart().some((point) => point.value === 340),
        ).toBe(false);
        expect(
            fixture.componentInstance.categoryMonthTable().incomeRows.map((row) => row.id),
        ).not.toContain('debt-taken');
        expect(
            fixture.componentInstance.categoryMonthTable().expenseRows.map((row) => row.id),
        ).not.toContain('debt-given');
        expect(
            fixture.componentInstance.categoryMonthTable().debtRows?.map((row) => row.id),
        ).toEqual(['owed-by-me', 'owed-to-me']);
    });

    it('formats analytics for a selected account in that account currency', () => {
        const bynAccount = account({ id: 'byn-account', name: 'BYN account', currencyCode: 'BYN' });
        const usdAccount = account({
            id: 'usd-account',
            name: 'USD card',
            currencyCode: 'USD',
            isPrimary: false,
        });
        const salaryCategory: CategoryResponse = {
            id: 'salary',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([bynAccount, usdAccount])));
        homeApi.getTransferRate.mockReturnValue(
            of({
                rate: 3,
                fromCurrencyCode: 'USD',
                toCurrencyCode: 'BYN',
            }),
        );
        homeApi.getTransactions.mockImplementation(
            (query: { size?: number; fromDate: string; toDate: string }) => {
                if (query.size) {
                    return of(page<TransactionResponse>([]));
                }

                return of(page([transaction('usd-income', usdAccount, salaryCategory, 100)]));
            },
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setAnalyticsAccountFilter('usd-account');

        const income = fixture.componentInstance
            .analyticsMetrics()
            .find((metric) => metric.id === 'metric-income');

        expect(income?.value).toContain('$');
        expect(income?.value).toContain('100');
        expect(income?.value).not.toContain('300');
    });

    it('ignores stale transaction page responses after the account filter changes again', () => {
        const firstAccount: AccountResponse = {
            id: 'first-account',
            name: 'First account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };
        const secondAccount: AccountResponse = {
            id: 'second-account',
            name: 'Second account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#67a6c1',
            isArchived: false,
            isPrimary: false,
        };
        const firstCategory: CategoryResponse = {
            id: 'first-category',
            name: 'First transaction',
            type: 'Debit',
            color: '#ff6f91',
        };
        const secondCategory: CategoryResponse = {
            id: 'second-category',
            name: 'Second transaction',
            type: 'Debit',
            color: '#e8b45d',
        };
        const firstFilterPage$ = new Subject<PagedResponse<TransactionResponse>>();
        const secondFilterPage$ = new Subject<PagedResponse<TransactionResponse>>();

        homeApi.getAccounts.mockReturnValue(of(page([firstAccount, secondAccount])));
        homeApi.getCategories.mockReturnValue(of(page([firstCategory, secondCategory])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getTransactions.mockImplementation(
            (query: { accountId?: string; fromDate: string; toDate: string }) => {
                if (query.accountId === 'first-account') {
                    return firstFilterPage$.asObservable();
                }

                if (query.accountId === 'second-account') {
                    return secondFilterPage$.asObservable();
                }

                return of(page<TransactionResponse>([]));
            },
        );

        fixture.componentInstance.setAccountFilter('first-account');
        fixture.componentInstance.setAccountFilter('second-account');

        secondFilterPage$.next(
            page([transaction('second-transaction', secondAccount, secondCategory, -20)]),
        );
        secondFilterPage$.complete();

        expect(fixture.componentInstance.filteredTransactions()[0]?.id).toBe('second-transaction');

        firstFilterPage$.next(
            page([transaction('first-transaction', firstAccount, firstCategory, -10)]),
        );
        firstFilterPage$.complete();

        expect(fixture.componentInstance.filteredTransactions()[0]?.id).toBe('second-transaction');
    });

    it('reloads only the current transaction page and selected balance when moving inside a loaded year', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-11T12:00:00'));

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
                        isPrimary: true,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getAccounts.mockClear();
        homeApi.getCurrentUser.mockClear();
        homeApi.getCategories.mockClear();
        homeApi.getTags.mockClear();
        homeApi.getTagById.mockClear();
        homeApi.getMonthBalance.mockClear();
        homeApi.getTransferRate.mockClear();
        homeApi.getTransactions.mockClear();

        fixture.componentInstance.goToNextMonth();

        expect(homeApi.getTransactions).toHaveBeenCalledTimes(1);
        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({
                fromDate: '2026-07-01',
                toDate: '2026-08-01',
                page: 1,
                size: 25,
            }),
        );
        expect(homeApi.getAccounts).not.toHaveBeenCalled();
        expect(homeApi.getCurrentUser).not.toHaveBeenCalled();
        expect(homeApi.getCategories).not.toHaveBeenCalled();
        expect(homeApi.getTags).not.toHaveBeenCalled();
        expect(homeApi.getTagById).not.toHaveBeenCalled();
        expect(homeApi.getMonthBalance).toHaveBeenCalledTimes(1);
        expect(homeApi.getMonthBalance).toHaveBeenCalledWith('main-account', 2026, 7);
        expect(homeApi.getTransferRate).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('reloads period data without a full dashboard reload when moving into a new year', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-12-11T12:00:00'));

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
                        isPrimary: true,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getAccounts.mockClear();
        homeApi.getCurrentUser.mockClear();
        homeApi.getCategories.mockClear();
        homeApi.getTags.mockClear();
        homeApi.getTagById.mockClear();
        homeApi.getMonthBalance.mockClear();
        homeApi.getTransferRate.mockClear();
        homeApi.getTransactions.mockClear();

        fixture.componentInstance.goToNextMonth();

        expect(homeApi.getTransactions).toHaveBeenCalledTimes(2);
        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({
                fromDate: '2027-01-01',
                toDate: '2027-02-01',
                page: 1,
                size: 25,
            }),
        );
        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({
                fromDate: '2027-01-01',
                toDate: '2028-01-01',
                page: 1,
            }),
        );
        expect(homeApi.getMonthBalance).toHaveBeenCalledTimes(1);
        expect(homeApi.getMonthBalance).toHaveBeenCalledWith('main-account', 2027, 1);
        expect(homeApi.getAccounts).not.toHaveBeenCalled();
        expect(homeApi.getCurrentUser).not.toHaveBeenCalled();
        expect(homeApi.getCategories).not.toHaveBeenCalled();
        expect(homeApi.getTags).not.toHaveBeenCalled();
        expect(homeApi.getTagById).not.toHaveBeenCalled();
        expect(homeApi.getTransferRate).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('hides the delete action for the primary account and refreshes accounts after deleting another account', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'primary-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 100,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'secondary-account',
                        name: 'Карта',
                        currencyCode: 'BYN',
                        currentBalance: 50,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setActiveTab('accounts');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const deleteButtons = host.querySelectorAll<HTMLElement>('[data-testid="delete-account"]');

        expect(deleteButtons).toHaveLength(1);

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialUserCalls = homeApi.getCurrentUser.mock.calls.length;
        const initialCategoryCalls = homeApi.getCategories.mock.calls.length;
        const initialTagListCalls = homeApi.getTags.mock.calls.length;
        const initialTagDetailsCalls = homeApi.getTagById.mock.calls.length;
        deleteButtons[0].click();

        expect(homeApi.deleteAccount).toHaveBeenCalledWith('secondary-account');
        expect(homeApi.getAccounts.mock.calls.length).toBeGreaterThan(initialAccountCalls);
        expect(homeApi.getCurrentUser).toHaveBeenCalledTimes(initialUserCalls);
        expect(homeApi.getCategories).toHaveBeenCalledTimes(initialCategoryCalls);
        expect(homeApi.getTags).toHaveBeenCalledTimes(initialTagListCalls);
        expect(homeApi.getTagById).toHaveBeenCalledTimes(initialTagDetailsCalls);
    });

    it('ignores direct deletes for primary or unknown accounts', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    account({ id: 'primary-account', isPrimary: true }),
                    account({ id: 'secondary-account', isPrimary: false }),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.deleteAccount('primary-account');
        fixture.componentInstance.deleteAccount('missing-account');

        expect(homeApi.deleteAccount).not.toHaveBeenCalled();
    });

    it('does not call the account delete API again while a mutation is pending', () => {
        const pendingDelete$ = new Subject<string>();

        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    account({ id: 'primary-account', isPrimary: true }),
                    account({ id: 'secondary-account', isPrimary: false }),
                ]),
            ),
        );
        homeApi.deleteAccount.mockReturnValue(pendingDelete$.asObservable());

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.deleteAccount('secondary-account');
        fixture.componentInstance.deleteAccount('secondary-account');

        expect(homeApi.deleteAccount).toHaveBeenCalledTimes(1);

        pendingDelete$.next('secondary-account');
        pendingDelete$.complete();
    });

    it('does not reload account-dependent data after deleting the last account', () => {
        const lastAccount = account({ id: 'last-account', isPrimary: false });

        homeApi.getAccounts
            .mockReturnValueOnce(of(page<AccountResponse>([lastAccount])))
            .mockReturnValueOnce(of(page<AccountResponse>([])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getTransactions.mockClear();
        homeApi.getMonthBalance.mockClear();
        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.deleteAccount('last-account');

        expect(homeApi.deleteAccount).toHaveBeenCalledWith('last-account');
        expect(fixture.componentInstance.needsAccountSetup()).toBe(true);
        expect(fixture.componentInstance.accounts()).toEqual([]);
        expect(fixture.componentInstance.filteredTransactions()).toEqual([]);
        expect(homeApi.getTransactions).not.toHaveBeenCalled();
        expect(homeApi.getMonthBalance).not.toHaveBeenCalled();
        expect(homeApi.getTransferRate).not.toHaveBeenCalled();
    });

    it('refreshes account-dependent data after creating an account without reloading stable dashboard data', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-11T12:00:00'));

        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'primary-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 100,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                ] as AccountResponse[]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setActiveTab('accounts');
        fixture.componentInstance.setNewAccountName('Карта');

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialUserCalls = homeApi.getCurrentUser.mock.calls.length;
        const initialCategoryCalls = homeApi.getCategories.mock.calls.length;
        const initialTagListCalls = homeApi.getTags.mock.calls.length;
        const initialTagDetailsCalls = homeApi.getTagById.mock.calls.length;
        const initialTransactionCalls = homeApi.getTransactions.mock.calls.length;

        fixture.componentInstance.createNewAccount();

        expect(homeApi.createAccount).toHaveBeenCalledWith({
            name: 'Карта',
            currencyCode: 'BYN',
            color: '#ffd166',
            initialBalance: 0,
        });
        expect(homeApi.getAccounts.mock.calls.length).toBeGreaterThan(initialAccountCalls);
        expect(homeApi.getCurrentUser).toHaveBeenCalledTimes(initialUserCalls);
        expect(homeApi.getCategories).toHaveBeenCalledTimes(initialCategoryCalls);
        expect(homeApi.getTags).toHaveBeenCalledTimes(initialTagListCalls);
        expect(homeApi.getTagById).toHaveBeenCalledTimes(initialTagDetailsCalls);
        expect(homeApi.getTransactions.mock.calls.length).toBe(initialTransactionCalls + 1);
        expect(homeApi.getTransactions).toHaveBeenLastCalledWith(
            expect.objectContaining({
                fromDate: '2026-06-01',
                toDate: '2026-07-01',
                page: 1,
                size: 25,
            }),
        );

        homeApi.getTransactions.mockClear();

        fixture.componentInstance.setActiveTab('analytics');

        expect(homeApi.getTransactions).toHaveBeenCalledTimes(1);
        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({
                fromDate: '2026-01-01',
                toDate: '2027-01-01',
                page: 1,
            }),
        );

        vi.useRealTimers();
    });

    it('ignores unsupported new account currency codes', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.setActiveTab('accounts');
        component.setNewAccountCurrency('ZZZ');
        component.setNewAccountName('Карта');
        component.createNewAccount();

        expect(homeApi.createAccount).toHaveBeenCalledWith({
            name: 'Карта',
            currencyCode: 'BYN',
            color: '#ffd166',
            initialBalance: 0,
        });
    });

    it('keeps the newest accounts when account refresh responses resolve out of order', () => {
        const staleAccountRefresh$ = new Subject<PagedResponse<AccountResponse>>();
        const primaryAccount: AccountResponse = {
            id: 'primary-account',
            name: 'Основной счёт',
            currencyCode: 'BYN',
            currentBalance: 100,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };
        const secondaryAccount: AccountResponse = {
            id: 'secondary-account',
            name: 'Карта',
            currencyCode: 'BYN',
            currentBalance: 50,
            color: '#67a6c1',
            isArchived: false,
            isPrimary: false,
        };

        homeApi.getAccounts
            .mockReturnValueOnce(of(page<AccountResponse>([primaryAccount, secondaryAccount])))
            .mockReturnValueOnce(staleAccountRefresh$.asObservable())
            .mockReturnValueOnce(of(page<AccountResponse>([primaryAccount])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.setNewAccountName('Карта');
        component.createNewAccount();

        expect(homeApi.getAccounts).toHaveBeenCalledTimes(2);

        component.deleteAccount('secondary-account');

        expect(homeApi.getAccounts).toHaveBeenCalledTimes(3);
        expect(component.accounts().map((account) => account.id)).toEqual(['primary-account']);

        staleAccountRefresh$.next(page<AccountResponse>([primaryAccount, secondaryAccount]));
        staleAccountRefresh$.complete();

        expect(component.accounts().map((account) => account.id)).toEqual(['primary-account']);
    });

    it('prefills the transfer rate from the backend when selected accounts change', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'BYN',
                        currencyCode: 'BYN',
                        currentBalance: 100,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'usd-account',
                        name: 'USD',
                        currencyCode: 'USD',
                        currentBalance: 50,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getTransferRate.mockReturnValue(
            of({ rate: 3.25, fromCurrencyCode: 'USD', toCurrencyCode: 'BYN' }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.updateTransferDraft({
            fromAccountId: 'usd-account',
            toAccountId: 'byn-account',
            amount: 0,
            rate: null,
            description: '',
        });

        expect(homeApi.getTransferRate).toHaveBeenCalledWith('usd-account', 'byn-account');
        expect(fixture.componentInstance.transferDraft().rate).toBe(3.25);
    });

    it('clears a stale transfer rate while loading a rate for a newly selected account pair', () => {
        const pendingNextRate$ = new Subject<{
            rate: number;
            fromCurrencyCode: string;
            toCurrencyCode: string;
        }>();

        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'BYN',
                        currencyCode: 'BYN',
                        currentBalance: 100,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'usd-account',
                        name: 'USD',
                        currencyCode: 'USD',
                        currentBalance: 50,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                    {
                        id: 'eur-account',
                        name: 'EUR',
                        currencyCode: 'EUR',
                        currentBalance: 40,
                        color: '#e8b45d',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) => {
            if (fromAccountId === 'eur-account' && toAccountId === 'byn-account') {
                return pendingNextRate$.asObservable();
            }

            return of({
                rate: 3.25,
                fromCurrencyCode: 'USD',
                toCurrencyCode: 'BYN',
            });
        });
        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.updateTransferDraft({
            fromAccountId: 'usd-account',
            toAccountId: 'byn-account',
            amount: 100,
            rate: 3.25,
            description: '',
        });

        expect(fixture.componentInstance.transferDraft().rate).toBe(3.25);

        homeApi.getTransferRate.mockClear();
        fixture.componentInstance.updateTransferDraft({
            ...fixture.componentInstance.transferDraft(),
            fromAccountId: 'eur-account',
            toAccountId: 'byn-account',
        });

        expect(homeApi.getTransferRate).toHaveBeenCalledWith('eur-account', 'byn-account');
        expect(fixture.componentInstance.transferDraft().rate).toBeNull();

        fixture.componentInstance.transferBetweenAccounts();

        expect(homeApi.createTransfer).not.toHaveBeenCalled();

        pendingNextRate$.next({
            rate: 2.9,
            fromCurrencyCode: 'EUR',
            toCurrencyCode: 'BYN',
        });
        pendingNextRate$.complete();

        expect(fixture.componentInstance.transferDraft().rate).toBe(2.9);
    });

    it('ignores stale transfer rate errors after the selected accounts change again', () => {
        const staleRate$ = new Subject<{
            rate: number;
            fromCurrencyCode: string;
            toCurrencyCode: string;
        }>();

        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'USD',
            }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-cash',
                        name: 'BYN cash',
                        currencyCode: 'BYN',
                        currentBalance: 100,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'byn-card',
                        name: 'BYN card',
                        currencyCode: 'BYN',
                        currentBalance: 50,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                    {
                        id: 'usd-account',
                        name: 'USD',
                        currencyCode: 'USD',
                        currentBalance: 25,
                        color: '#e8b45d',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) => {
            if (fromAccountId === 'usd-account' && toAccountId === 'byn-cash') {
                return staleRate$.asObservable();
            }

            return of({
                rate: 0.31,
                fromCurrencyCode: 'BYN',
                toCurrencyCode: 'USD',
            });
        });

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.updateTransferDraft({
            fromAccountId: 'usd-account',
            toAccountId: 'byn-cash',
            amount: 0,
            rate: null,
            description: '',
        });
        fixture.componentInstance.updateTransferDraft({
            fromAccountId: 'byn-cash',
            toAccountId: 'usd-account',
            amount: 0,
            rate: null,
            description: '',
        });

        expect(homeApi.getTransferRate).toHaveBeenCalledWith('usd-account', 'byn-cash');
        expect(homeApi.getTransferRate).toHaveBeenCalledWith('byn-cash', 'usd-account');
        expect(fixture.componentInstance.transferDraft().rate).toBe(0.31);

        staleRate$.error(new HttpErrorResponse({ status: 500, statusText: 'Server error' }));

        expect(fixture.componentInstance.transferDraft().rate).toBe(0.31);
        expect(fixture.componentInstance.transferRateError()).toBe('');
        expect(fixture.componentInstance.errorMessage()).toBe('');
    });

    it('shows the primary account balance in the summary and the aggregate balance in accounts', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'usd-account',
                        name: 'USD reserve',
                        currencyCode: 'USD',
                        currentBalance: 5,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) =>
            of({
                rate: fromAccountId === 'usd-account' && toAccountId === 'byn-account' ? 3 : 1,
                fromCurrencyCode: fromAccountId === 'usd-account' ? 'USD' : 'BYN',
                toCurrencyCode: 'BYN',
            }),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId,
                    currencyCode: accountId === 'usd-account' ? 'USD' : 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: accountId === 'usd-account' ? 5 : 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const balanceCard = fixture.componentInstance
            .summaryCards()
            .find((card) => card.id === 'balance');

        expect(homeApi.getTransferRate).toHaveBeenCalledWith('usd-account', 'byn-account');
        expect(balanceCard?.value).toContain('10');
        expect(balanceCard?.value).toContain('Br');
        expect(balanceCard?.helper).toBe('Основной счёт');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('25');

        fixture.componentInstance.setActiveTab('accounts');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent ?? '').toContain('Сводный баланс');
        expect(host.textContent ?? '').toContain('25,00 Br');
    });

    it('shows the selected month primary account balance when the account current balance is stale', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-21T12:00:00'));

        const mainAccount = account({
            id: 'main-account',
            name: 'Main account',
            currentBalance: 0,
            currencyCode: 'BYN',
            isPrimary: true,
        });
        const incomeCategory: CategoryResponse = {
            id: 'income-category',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getTransactions.mockReturnValue(
            of(
                page<TransactionResponse>([
                    transaction('income-id', mainAccount, incomeCategory, 11),
                ]),
            ),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: 'Main account',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: -14,
                    closingBalance: -14,
                    year,
                    month,
                }),
        );

        try {
            fixture = TestBed.createComponent(HomePageComponent);
            fixture.detectChanges();

            const cards = fixture.componentInstance.summaryCards();
            const balanceCard = cards.find((card) => card.id === 'balance');
            const debtBalanceCard = cards.find((card) => card.id === 'debt-balance');
            const incomeCard = cards.find((card) => card.id === 'income');

            expect(incomeCard?.value).toContain('11');
            expect(balanceCard?.value).toContain('-14');
            expect(balanceCard?.value).not.toContain('0,00');
            expect(debtBalanceCard?.value).toBe(balanceCard?.value);
        } finally {
            vi.useRealTimers();
        }
    });

    it('hides stale month values while the newly selected month is still loading', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-21T12:00:00'));

        const mainAccount = account({
            id: 'main-account',
            name: 'Main account',
            currentBalance: 999,
            currencyCode: 'BYN',
            isPrimary: true,
        });
        const incomeCategory: CategoryResponse = {
            id: 'income-category',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };
        const pendingJulyBalance$ = new Subject<MonthBalanceResponse>();
        const pendingJulyTransactions$ = new Subject<PagedResponse<TransactionResponse>>();
        const juneTransaction = transaction('june-income', mainAccount, incomeCategory, 100);
        const julyTransaction = {
            ...transaction('july-income', mainAccount, incomeCategory, 70),
            date: '2026-07-05T12:00:00',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getTransactions.mockImplementation(
            (query: { size?: number; fromDate: string; toDate: string }) => {
                if (query.size && query.fromDate === '2026-07-01') {
                    return pendingJulyTransactions$.asObservable();
                }

                if (query.size) {
                    return of(page<TransactionResponse>([juneTransaction]));
                }

                return of(page<TransactionResponse>([juneTransaction, julyTransaction]));
            },
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) => {
                if (year === 2026 && month === 7) {
                    return pendingJulyBalance$.asObservable();
                }

                return of<MonthBalanceResponse>({
                    accountId,
                    accountName: 'Main account',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: 100,
                    year,
                    month,
                });
            },
        );

        try {
            fixture = TestBed.createComponent(HomePageComponent);
            fixture.detectChanges();

            const component = fixture.componentInstance;

            expect(summaryCardValue(component, 'balance')).toContain('100');
            expect(summaryCardValue(component, 'operations')).toBe('1');

            component.goToNextMonth();

            expect(summaryCardValue(component, 'balance')).toBe('...');
            expect(summaryCardValue(component, 'balance')).not.toContain('999');
            expect(summaryCardValue(component, 'operations')).toBe('0');
            expect(summaryCardValue(component, 'income')).toContain('70');
        } finally {
            vi.useRealTimers();
        }
    });

    it('keeps dashboard totals in the primary account currency when new account currency changes', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                ] as AccountResponse[]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setNewAccountCurrency('USD');

        const balanceCard = fixture.componentInstance
            .summaryCards()
            .find((card) => card.id === 'balance');

        expect(balanceCard?.value).toContain('Br');
        expect(balanceCard?.value).not.toContain('$');
    });

    it('prefills new account currency from saved application settings', () => {
        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'USD',
            }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    account({
                        id: 'byn-account',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                    }),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        expect(component.newAccountCurrency()).toBe('USD');

        component.setNewAccountName('Savings');
        component.createNewAccount();

        expect(homeApi.createAccount).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Savings',
                currencyCode: 'USD',
            }),
        );
    });

    it('keeps the saved application currency visible when it has no matching account', () => {
        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'EUR',
            }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: 'Основной счёт',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('EUR');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('€');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).not.toContain('Br');
        expect(homeApi.getTransferRate).not.toHaveBeenCalled();
    });

    it('keeps the application currency after deleting the last account in that currency', () => {
        const primaryAccount: AccountResponse = {
            id: 'byn-account',
            name: 'Main BYN account',
            currencyCode: 'BYN',
            currentBalance: 10,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };
        const eurAccount: AccountResponse = {
            id: 'eur-account',
            name: 'EUR reserve',
            currencyCode: 'EUR',
            currentBalance: 5,
            color: '#67a6c1',
            isArchived: false,
            isPrimary: false,
        };

        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'EUR',
            }),
        );
        homeApi.getAccounts
            .mockReturnValueOnce(of(page<AccountResponse>([primaryAccount, eurAccount])))
            .mockReturnValueOnce(of(page<AccountResponse>([primaryAccount])));
        homeApi.getTransferRate.mockReturnValue(
            of({
                rate: 0.25,
                fromCurrencyCode: 'BYN',
                toCurrencyCode: 'EUR',
            }),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId === 'eur-account' ? 'EUR reserve' : 'Main BYN account',
                    currencyCode: accountId === 'eur-account' ? 'EUR' : 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: accountId === 'eur-account' ? 5 : 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('EUR');

        fixture.componentInstance.deleteAccount('eur-account');

        expect(homeApi.deleteAccount).toHaveBeenCalledWith('eur-account');
        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('EUR');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('€');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).not.toContain('Br');
    });

    it('shows the primary account balance after closing debt categories in summary cards', () => {
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Основной счёт',
            currencyCode: 'BYN',
            currentBalance: 1000,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };
        const secondaryAccount: AccountResponse = {
            id: 'secondary-account',
            name: 'Savings',
            currencyCode: 'BYN',
            currentBalance: 1000,
            color: '#67a6c1',
            isArchived: false,
            isPrimary: false,
        };
        const categories: CategoryResponse[] = [
            {
                id: 'debt-taken',
                name: 'Взято в долг (+)',
                type: 'Credit',
                color: '#23c78b',
                isSystem: true,
            },
            {
                id: 'debt-returned',
                name: 'Возвращено по долгу (-)',
                type: 'Debit',
                color: '#ff6f91',
                isSystem: true,
            },
            {
                id: 'debt-given',
                name: 'Дано в долг (-)',
                type: 'Debit',
                color: '#e8b45d',
                isSystem: true,
            },
            {
                id: 'debt-paid-back',
                name: 'Отдано по долгу (+)',
                type: 'Credit',
                color: '#67a6c1',
                isSystem: true,
            },
        ];
        const transactions = [
            transaction('taken', account, categories[0], 300),
            transaction('returned', account, categories[1], -100),
            transaction('given', account, categories[2], -200),
            transaction('paid-back', account, categories[3], 50),
        ];

        homeApi.getAccounts.mockReturnValue(of(page([account, secondaryAccount])));
        homeApi.getCategories.mockReturnValue(of(page(categories)));
        homeApi.getTransactions.mockReturnValue(of(page(transactions)));
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: 'Основной счёт',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: 1000,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const debtCard = fixture.componentInstance
            .summaryCards()
            .find((card) => card.id === 'debt-balance');

        expect(debtCard?.value).toBe('950,00 Br');
        expect(debtCard?.helper).toBe('Баланс после закрытия долгов');
        expect(debtCard?.helperLines).toHaveLength(2);
        expect(debtCard?.helperLines?.[0]).toContain('200');
        expect(debtCard?.helperLines?.[1]).toContain('150');
    });

    it('calculates the debt summary only up to the selected month', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-21T12:00:00'));

        const mainAccount = account({
            id: 'main-account',
            name: 'Main account',
            currentBalance: 1000,
            currencyCode: 'BYN',
            isPrimary: true,
        });
        const debtTakenCategory: CategoryResponse = {
            id: 'debt-taken',
            name: 'Взято в долг (+)',
            type: 'Credit',
            color: '#23c78b',
            isSystem: true,
        };
        const debtReturnedCategory: CategoryResponse = {
            id: 'debt-returned',
            name: 'Возвращено по долгу (-)',
            type: 'Debit',
            color: '#ff6f91',
            isSystem: true,
        };
        const debtGivenCategory: CategoryResponse = {
            id: 'debt-given',
            name: 'Дано в долг (-)',
            type: 'Debit',
            color: '#e8b45d',
            isSystem: true,
        };
        const debtReceivedCategory: CategoryResponse = {
            id: 'debt-received',
            name: 'Получено по долгу (+)',
            type: 'Credit',
            color: '#67a6c1',
            isSystem: true,
        };

        homeApi.getAccounts.mockReturnValue(of(page([mainAccount])));
        homeApi.getCategories.mockReturnValue(
            of(
                page([
                    debtTakenCategory,
                    debtReturnedCategory,
                    debtGivenCategory,
                    debtReceivedCategory,
                ]),
            ),
        );
        homeApi.getTransactions.mockImplementation(
            (query: { size?: number; fromDate: string; toDate: string }) => {
                if (query.size) {
                    return of(page<TransactionResponse>([]));
                }

                return of(
                    page([
                        transaction('taken-current', mainAccount, debtTakenCategory, 300),
                        transaction('returned-current', mainAccount, debtReturnedCategory, -100),
                        transaction('given-current', mainAccount, debtGivenCategory, -200),
                        transaction('received-current', mainAccount, debtReceivedCategory, 50),
                        {
                            ...transaction('taken-future', mainAccount, debtTakenCategory, 500),
                            date: '2026-12-05T12:00:00',
                        },
                        {
                            ...transaction('given-future', mainAccount, debtGivenCategory, -1000),
                            date: '2026-12-05T12:00:00',
                        },
                    ]),
                );
            },
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: 'Main account',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: 1000,
                    year,
                    month,
                }),
        );

        try {
            fixture = TestBed.createComponent(HomePageComponent);
            fixture.detectChanges();

            const debtCard = fixture.componentInstance
                .summaryCards()
                .find((card) => card.id === 'debt-balance');

            expect(debtCard?.value).toBe('950,00 Br');
            expect(debtCard?.helperLines?.[0]).toContain('200');
            expect(debtCard?.helperLines?.[1]).toContain('150');
        } finally {
            vi.useRealTimers();
        }
    });

    it('loads the application currency from the current user and converts through a matching account', () => {
        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'EUR',
            }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'eur-account',
                        name: 'EUR reserve',
                        currencyCode: 'EUR',
                        currentBalance: 5,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) =>
            of({
                rate: fromAccountId === 'byn-account' && toAccountId === 'eur-account' ? 0.25 : 1,
                fromCurrencyCode: fromAccountId === 'byn-account' ? 'BYN' : 'EUR',
                toCurrencyCode: 'EUR',
            }),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId,
                    currencyCode: accountId === 'eur-account' ? 'EUR' : 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: accountId === 'eur-account' ? 5 : 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const balanceCard = fixture.componentInstance
            .summaryCards()
            .find((card) => card.id === 'balance');

        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('EUR');
        expect(homeApi.getTransferRate).toHaveBeenCalledWith('byn-account', 'eur-account');
        expect(balanceCard?.value).toContain('2,50');
        expect(balanceCard?.value).toContain('€');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('7,50');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('€');
    });

    it('loads application exchange rates sequentially instead of starting every rate request at once', () => {
        const bynRate$ = new Subject<{
            rate: number;
            fromCurrencyCode: string;
            toCurrencyCode: string;
        }>();
        const usdRate$ = new Subject<{
            rate: number;
            fromCurrencyCode: string;
            toCurrencyCode: string;
        }>();

        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'EUR',
            }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'BYN account',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'usd-account',
                        name: 'USD account',
                        currencyCode: 'USD',
                        currentBalance: 20,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                    {
                        id: 'eur-account',
                        name: 'EUR account',
                        currencyCode: 'EUR',
                        currentBalance: 5,
                        color: '#e8b45d',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId,
                    currencyCode:
                        accountId === 'eur-account'
                            ? 'EUR'
                            : accountId === 'usd-account'
                              ? 'USD'
                              : 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance:
                        accountId === 'eur-account' ? 5 : accountId === 'usd-account' ? 20 : 10,
                    year,
                    month,
                }),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string) => {
            if (fromAccountId === 'byn-account') {
                return bynRate$.asObservable();
            }

            if (fromAccountId === 'usd-account') {
                return usdRate$.asObservable();
            }

            return of({
                rate: 1,
                fromCurrencyCode: 'EUR',
                toCurrencyCode: 'EUR',
            });
        });

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getTransferRate).toHaveBeenCalledTimes(1);
        expect(homeApi.getTransferRate).toHaveBeenCalledWith('byn-account', 'eur-account');

        bynRate$.next({
            rate: 0.25,
            fromCurrencyCode: 'BYN',
            toCurrencyCode: 'EUR',
        });
        bynRate$.complete();

        expect(homeApi.getTransferRate).toHaveBeenCalledTimes(2);
        expect(homeApi.getTransferRate).toHaveBeenCalledWith('usd-account', 'eur-account');

        usdRate$.next({
            rate: 0.1,
            fromCurrencyCode: 'USD',
            toCurrencyCode: 'EUR',
        });
        usdRate$.complete();

        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('9,50');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('€');
    });

    it('marks the primary balance summary as negative when the primary account is below zero', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'primary-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: -15,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: 'Основной счёт',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: -15,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const balanceCard = fixture.componentInstance
            .summaryCards()
            .find((card) => card.id === 'balance');

        expect(balanceCard?.value).toContain('-15');
        expect(balanceCard?.tone).toBe('negative');
    });

    it('changes application currency locally without calling the unsupported settings endpoint', () => {
        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'BYN',
            }),
        );
        homeApi.updateApplicationCurrency.mockReturnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 404,
                        statusText: 'Not Found',
                    }),
            ),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'eur-account',
                        name: 'EUR reserve',
                        currencyCode: 'EUR',
                        currentBalance: 5,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) =>
            of({
                rate: fromAccountId === 'byn-account' && toAccountId === 'eur-account' ? 0.25 : 1,
                fromCurrencyCode: fromAccountId === 'byn-account' ? 'BYN' : 'EUR',
                toCurrencyCode: toAccountId === 'eur-account' ? 'EUR' : 'BYN',
            }),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId,
                    currencyCode: accountId === 'eur-account' ? 'EUR' : 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: accountId === 'eur-account' ? 5 : 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getAccounts.mockClear();
        homeApi.getCurrentUser.mockClear();
        homeApi.getCategories.mockClear();
        homeApi.getTransactions.mockClear();
        homeApi.getMonthBalance.mockClear();
        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.updateApplicationCurrency('EUR');

        expect(homeApi.updateApplicationCurrency).not.toHaveBeenCalled();
        expect(homeApi.getTransferRate).toHaveBeenCalledTimes(1);
        expect(homeApi.getTransferRate).toHaveBeenCalledWith('byn-account', 'eur-account');
        expect(homeApi.getAccounts).not.toHaveBeenCalled();
        expect(homeApi.getCurrentUser).not.toHaveBeenCalled();
        expect(homeApi.getCategories).not.toHaveBeenCalled();
        expect(homeApi.getTransactions).not.toHaveBeenCalled();
        expect(homeApi.getMonthBalance).not.toHaveBeenCalled();
        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('EUR');
        expect(fixture.componentInstance.newAccountCurrency()).toBe('EUR');
        expect(window.localStorage.getItem('msaver:application-currency')).toBe('EUR');
        expect(fixture.componentInstance.errorMessage()).toBe('');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('7,50');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('€');
    });

    it('restores the locally selected application currency after a page reload', () => {
        window.localStorage.setItem('msaver:application-currency', 'BYN');
        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'USD',
            }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'usd-account',
                        name: 'USD account',
                        currencyCode: 'USD',
                        currentBalance: 5,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'byn-account',
                        name: 'BYN account',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) =>
            of({
                rate: fromAccountId === 'usd-account' && toAccountId === 'byn-account' ? 3 : 1,
                fromCurrencyCode: fromAccountId === 'usd-account' ? 'USD' : 'BYN',
                toCurrencyCode: toAccountId === 'byn-account' ? 'BYN' : 'USD',
            }),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId,
                    currencyCode: accountId === 'usd-account' ? 'USD' : 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: accountId === 'usd-account' ? 5 : 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('BYN');
        expect(homeApi.getTransferRate).toHaveBeenCalledWith('usd-account', 'byn-account');
    });

    it('keeps the selected application currency when one display-rate request fails', () => {
        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'BYN',
            }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'BYN account',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'eur-account',
                        name: 'EUR reserve',
                        currencyCode: 'EUR',
                        currentBalance: 5,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) => {
            if (fromAccountId === 'byn-account' && toAccountId === 'eur-account') {
                return throwError(
                    () =>
                        new HttpErrorResponse({
                            status: 404,
                            statusText: 'Not Found',
                        }),
                );
            }

            return of({
                rate: 1,
                fromCurrencyCode: fromAccountId === 'eur-account' ? 'EUR' : 'BYN',
                toCurrencyCode: toAccountId === 'eur-account' ? 'EUR' : 'BYN',
            });
        });
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId,
                    currencyCode: accountId === 'eur-account' ? 'EUR' : 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: accountId === 'eur-account' ? 5 : 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.updateApplicationCurrency('EUR');

        expect(homeApi.getTransferRate).toHaveBeenCalledWith('byn-account', 'eur-account');
        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('EUR');
        expect(fixture.componentInstance.errorMessage()).toBe('');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).not.toContain('Br');
    });

    it('keeps the selected settings currency even without an account in that currency', () => {
        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'BYN',
            }),
        );
        homeApi.updateApplicationCurrency.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'USD',
            }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'byn-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                ]),
            ),
        );
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId,
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance: 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.updateApplicationCurrency('USD');

        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('USD');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('$');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).not.toContain('Br');
        expect(homeApi.getTransferRate).not.toHaveBeenCalled();
    });

    it('ignores unsupported application currency codes', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page<AccountResponse>([
                    {
                        id: 'byn-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.updateApplicationCurrency.mockClear();
        homeApi.getTransferRate.mockClear();

        fixture.componentInstance.updateApplicationCurrency('ZZZ');

        expect(homeApi.updateApplicationCurrency).not.toHaveBeenCalled();
        expect(homeApi.getTransferRate).not.toHaveBeenCalled();
        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('BYN');
    });

    it('keeps the newest application currency when exchange-rate refreshes resolve out of order', () => {
        const staleEurRate$ = new Subject<{
            rate: number;
            fromCurrencyCode: string;
            toCurrencyCode: string;
        }>();

        homeApi.getCurrentUser.mockReturnValue(
            of<CurrentUserResponse>({
                id: 'user-123',
                username: 'Alex',
                email: 'alex@example.com',
                applicationCurrencyCode: 'BYN',
            }),
        );
        homeApi.updateApplicationCurrency.mockImplementation(
            (payload: { applicationCurrencyCode: string }) =>
                of<CurrentUserResponse>({
                    id: 'user-123',
                    username: 'Alex',
                    email: 'alex@example.com',
                    applicationCurrencyCode: payload.applicationCurrencyCode,
                }),
        );
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'BYN account',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                    {
                        id: 'eur-account',
                        name: 'EUR account',
                        currencyCode: 'EUR',
                        currentBalance: 5,
                        color: '#67a6c1',
                        isArchived: false,
                        isPrimary: false,
                    },
                    {
                        id: 'usd-account',
                        name: 'USD account',
                        currencyCode: 'USD',
                        currentBalance: 20,
                        color: '#e8b45d',
                        isArchived: false,
                        isPrimary: false,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.getTransferRate.mockImplementation((fromAccountId: string, toAccountId: string) => {
            if (fromAccountId === 'byn-account' && toAccountId === 'eur-account') {
                return staleEurRate$.asObservable();
            }

            return of({
                rate: toAccountId === 'usd-account' ? 0.5 : 1,
                fromCurrencyCode:
                    fromAccountId === 'eur-account'
                        ? 'EUR'
                        : fromAccountId === 'usd-account'
                          ? 'USD'
                          : 'BYN',
                toCurrencyCode:
                    toAccountId === 'eur-account'
                        ? 'EUR'
                        : toAccountId === 'usd-account'
                          ? 'USD'
                          : 'BYN',
            });
        });
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) =>
                of<MonthBalanceResponse>({
                    accountId,
                    accountName: accountId,
                    currencyCode:
                        accountId === 'eur-account'
                            ? 'EUR'
                            : accountId === 'usd-account'
                              ? 'USD'
                              : 'BYN',
                    openingBalance: 0,
                    monthChange: 0,
                    closingBalance:
                        accountId === 'eur-account' ? 5 : accountId === 'usd-account' ? 20 : 10,
                    year,
                    month,
                }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.updateApplicationCurrency('EUR');
        fixture.componentInstance.updateApplicationCurrency('USD');

        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('USD');

        staleEurRate$.next({
            rate: 0.25,
            fromCurrencyCode: 'BYN',
            toCurrencyCode: 'EUR',
        });
        staleEurRate$.complete();

        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('USD');
    });

    it('renders settings as a full tab with only the application currency', () => {
        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'byn-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 10,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                ] as AccountResponse[]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setNewAccountCurrency('USD');
        fixture.componentInstance.setActiveTab('settings');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('ms-settings-tab')).not.toBeNull();
        expect(host.textContent ?? '').toContain('BYN');
        expect(host.textContent ?? '').not.toContain('USD');
    });

    it('shows backend validation details when account creation fails', () => {
        const conflictMessage = 'Счёт с таким названием уже существует.';

        homeApi.getAccounts.mockReturnValue(
            of(
                page([
                    {
                        id: 'main-account',
                        name: 'Основной счёт',
                        currencyCode: 'BYN',
                        currentBalance: 0,
                        color: '#23c78b',
                        isArchived: false,
                        isPrimary: true,
                    },
                ] as AccountResponse[]),
            ),
        );
        homeApi.createAccount.mockReturnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 409,
                        error: {
                            code: 'Account.NameAlreadyExists',
                            message: conflictMessage,
                            details: {
                                name: [conflictMessage],
                            },
                        },
                    }),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setActiveTab('accounts');
        fixture.componentInstance.setNewAccountName('Основной счёт');
        fixture.componentInstance.createNewAccount();
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        expect(host.textContent ?? '').toContain(conflictMessage);
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

    it('does not save a transaction when the amount is not a positive finite number', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
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

        [-12.35, Number.NaN, Number.POSITIVE_INFINITY].forEach((amount) => {
            fixture.componentInstance.updateTransactionDraft({
                type: 'expense',
                accountId: 'main-account',
                categoryId: 'expense-category',
                amount,
                date: '05.06.2026',
                description: 'Lunch',
            });
            fixture.componentInstance.saveTransaction();
        });

        expect(homeApi.createTransaction).not.toHaveBeenCalled();
    });

    it('does not save a transaction for an unknown account', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
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

        fixture.componentInstance.updateTransactionDraft({
            type: 'expense',
            accountId: 'missing-account',
            categoryId: 'expense-category',
            amount: 12.35,
            date: '05.06.2026',
            description: 'Lunch',
        });
        fixture.componentInstance.saveTransaction();

        expect(homeApi.createTransaction).not.toHaveBeenCalled();
    });

    it('does not save a transaction for an unknown category', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
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

        fixture.componentInstance.updateTransactionDraft({
            type: 'expense',
            accountId: 'main-account',
            categoryId: 'missing-category',
            amount: 12.35,
            date: '05.06.2026',
            description: 'Lunch',
        });
        fixture.componentInstance.saveTransaction();

        expect(homeApi.createTransaction).not.toHaveBeenCalled();
    });

    it('refreshes transaction data after saving without reloading static dashboard data', () => {
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
        fixture.componentInstance.startAddingTransaction();

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialCurrentUserCalls = homeApi.getCurrentUser.mock.calls.length;
        const initialCategoryCalls = homeApi.getCategories.mock.calls.length;
        const initialTransactionCalls = homeApi.getTransactions.mock.calls.length;
        const initialBalanceCalls = homeApi.getMonthBalance.mock.calls.length;

        fixture.componentInstance.updateTransactionDraft({
            type: 'expense',
            accountId: 'main-account',
            categoryId: 'expense-category',
            amount: 12.35,
            date: '05.06.2026',
            description: 'Lunch',
        });
        fixture.componentInstance.saveTransaction();

        expect(homeApi.createTransaction).toHaveBeenCalled();
        expect(homeApi.getTransactions.mock.calls.length).toBe(initialTransactionCalls + 2);
        expect(homeApi.getMonthBalance.mock.calls.length).toBe(initialBalanceCalls + 1);
        expect(homeApi.getAccounts.mock.calls.length).toBe(initialAccountCalls);
        expect(homeApi.getCurrentUser.mock.calls.length).toBe(initialCurrentUserCalls);
        expect(homeApi.getCategories.mock.calls.length).toBe(initialCategoryCalls);

        homeApi.getTransactions.mockClear();

        fixture.componentInstance.setActiveTab('analytics');

        expect(homeApi.getTransactions).not.toHaveBeenCalled();
    });

    it('updates overview income totals after creating a transaction', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-11T12:00:00'));

        const mainAccount = account({ id: 'main-account', name: 'Main account' });
        const incomeCategory: CategoryResponse = {
            id: 'income-category',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };
        let includeCreatedTransaction = false;

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([incomeCategory])));
        homeApi.getTransactions.mockImplementation(() =>
            of(
                page(
                    includeCreatedTransaction
                        ? [transaction('income-transaction', mainAccount, incomeCategory, 150)]
                        : [],
                ),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.updateTransactionDraft({
            type: 'income',
            accountId: 'main-account',
            categoryId: 'income-category',
            amount: 150,
            date: '2026-06-05T12:00',
            description: 'Salary',
        });
        includeCreatedTransaction = true;
        component.saveTransaction();

        expect(summaryCardValue(component, 'income')).toContain('150');

        vi.useRealTimers();
    });

    it('keeps the newest selected month balance when balance refreshes resolve out of order', () => {
        const staleBalanceRefresh$ = new Subject<MonthBalanceResponse>();
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
        };
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff8fab',
        };
        let balanceCall = 0;

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));
        homeApi.getMonthBalance.mockImplementation(
            (accountId: string, year: number, month: number) => {
                balanceCall += 1;

                const response = (closingBalance: number): MonthBalanceResponse => ({
                    accountId,
                    accountName: 'Main account',
                    currencyCode: 'BYN',
                    openingBalance: 0,
                    monthChange: closingBalance,
                    closingBalance,
                    year,
                    month,
                });

                if (balanceCall === 2) {
                    return staleBalanceRefresh$.asObservable();
                }

                if (balanceCall === 3) {
                    return of(response(200));
                }

                return of(response(0));
            },
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.updateTransactionDraft({
            type: 'expense',
            accountId: 'main-account',
            categoryId: 'expense-category',
            amount: 10,
            date: '05.06.2026',
            description: 'Lunch',
        });
        component.saveTransaction();

        expect(homeApi.getMonthBalance).toHaveBeenCalledTimes(2);

        component.updateTransactionDraft({
            type: 'expense',
            accountId: 'main-account',
            categoryId: 'expense-category',
            amount: 20,
            date: '05.06.2026',
            description: 'Dinner',
        });
        component.saveTransaction();

        expect(homeApi.getMonthBalance).toHaveBeenCalledTimes(3);
        expect(component.accounts()[0].balanceValue).toBe(200);

        staleBalanceRefresh$.next({
            accountId: 'main-account',
            accountName: 'Main account',
            currencyCode: 'BYN',
            openingBalance: 0,
            monthChange: 50,
            closingBalance: 50,
            year: 2026,
            month: 6,
        });
        staleBalanceRefresh$.complete();

        expect(component.accounts()[0].balanceValue).toBe(200);
    });

    it('preserves transaction time when saving a transaction', () => {
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
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.updateTransactionDraft({
            type: 'income',
            accountId: 'main-account',
            categoryId: 'income-category',
            amount: 100,
            date: '2026-06-05T14:37',
            description: 'Bonus',
        });
        fixture.componentInstance.saveTransaction();

        expect(homeApi.createTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                date: '2026-06-05T14:37:00',
            }),
        );
    });

    it('prefills and updates an existing expense transaction', () => {
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
        };
        const incomeCategory: CategoryResponse = {
            id: 'income-category',
            name: 'Salary',
            type: 'Credit',
            color: '#23c78b',
        };
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff8fab',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getCategories.mockReturnValue(
            of(page<CategoryResponse>([incomeCategory, expenseCategory])),
        );
        homeApi.getTransactions.mockReturnValue(
            of(
                page<TransactionResponse>([
                    transaction('expense-transaction', account, expenseCategory, -25),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.startEditingTransaction(component.filteredTransactions()[0]);

        expect(component.transactionDraft()).toEqual({
            type: 'expense',
            accountId: 'main-account',
            categoryId: 'expense-category',
            amount: 25,
            date: '2026-06-05T12:00',
            description: 'Food',
        });

        component.updateTransactionDraft({
            ...component.transactionDraft(),
            amount: 30,
            date: '2026-06-06T14:30',
            description: '  Updated lunch  ',
        });
        component.saveTransaction();

        expect(homeApi.updateTransaction).toHaveBeenCalledWith('expense-transaction', {
            categoryId: 'expense-category',
            amount: -30,
            date: '2026-06-06T14:30:00',
            description: 'Updated lunch',
        });
        expect(homeApi.createTransaction).not.toHaveBeenCalled();
    });

    it('refreshes transaction data after updating without reloading static dashboard data', () => {
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
        };
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff8fab',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));
        homeApi.getTransactions.mockReturnValue(
            of(
                page<TransactionResponse>([
                    transaction('expense-transaction', account, expenseCategory, -25),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;
        component.startEditingTransaction(component.filteredTransactions()[0]);
        component.updateTransactionDraft({
            ...component.transactionDraft(),
            amount: 30,
            description: 'Updated lunch',
        });

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialCurrentUserCalls = homeApi.getCurrentUser.mock.calls.length;
        const initialCategoryCalls = homeApi.getCategories.mock.calls.length;
        const initialTransactionCalls = homeApi.getTransactions.mock.calls.length;
        const initialBalanceCalls = homeApi.getMonthBalance.mock.calls.length;

        component.saveTransaction();

        expect(homeApi.updateTransaction).toHaveBeenCalled();
        expect(homeApi.getTransactions.mock.calls.length).toBe(initialTransactionCalls + 2);
        expect(homeApi.getMonthBalance.mock.calls.length).toBe(initialBalanceCalls + 1);
        expect(homeApi.getAccounts.mock.calls.length).toBe(initialAccountCalls);
        expect(homeApi.getCurrentUser.mock.calls.length).toBe(initialCurrentUserCalls);
        expect(homeApi.getCategories.mock.calls.length).toBe(initialCategoryCalls);
    });

    it('updates overview expense totals after editing a transaction', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-11T12:00:00'));

        const mainAccount = account({ id: 'main-account', name: 'Main account' });
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff8fab',
        };
        let expenseAmount = -25;

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));
        homeApi.getTransactions.mockImplementation(() =>
            of(
                page<TransactionResponse>([
                    transaction('expense-transaction', mainAccount, expenseCategory, expenseAmount),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        expect(summaryCardValue(component, 'expense')).toContain('25');

        component.startEditingTransaction(component.filteredTransactions()[0]);
        component.updateTransactionDraft({
            ...component.transactionDraft(),
            amount: 30,
            description: 'Updated lunch',
        });
        expenseAmount = -30;
        component.saveTransaction();

        expect(summaryCardValue(component, 'expense')).toContain('30');

        vi.useRealTimers();
    });

    it('refreshes transaction data after deleting without reloading static dashboard data', () => {
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
        };
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff8fab',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));
        homeApi.getTransactions.mockReturnValue(
            of(
                page<TransactionResponse>([
                    transaction('expense-transaction', account, expenseCategory, -25),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialCurrentUserCalls = homeApi.getCurrentUser.mock.calls.length;
        const initialCategoryCalls = homeApi.getCategories.mock.calls.length;
        const initialTransactionCalls = homeApi.getTransactions.mock.calls.length;
        const initialBalanceCalls = homeApi.getMonthBalance.mock.calls.length;

        fixture.componentInstance.deleteTransaction('expense-transaction');

        expect(homeApi.deleteTransaction).toHaveBeenCalledWith('expense-transaction');
        expect(homeApi.getTransactions.mock.calls.length).toBe(initialTransactionCalls + 2);
        expect(homeApi.getMonthBalance.mock.calls.length).toBe(initialBalanceCalls + 1);
        expect(homeApi.getAccounts.mock.calls.length).toBe(initialAccountCalls);
        expect(homeApi.getCurrentUser.mock.calls.length).toBe(initialCurrentUserCalls);
        expect(homeApi.getCategories.mock.calls.length).toBe(initialCategoryCalls);
    });

    it('updates overview expense totals after deleting a transaction', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-11T12:00:00'));

        const mainAccount = account({ id: 'main-account', name: 'Main account' });
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff8fab',
        };
        let isDeleted = false;

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([mainAccount])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));
        homeApi.getTransactions.mockImplementation(() =>
            of(
                page(
                    isDeleted
                        ? []
                        : [transaction('expense-transaction', mainAccount, expenseCategory, -25)],
                ),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        expect(summaryCardValue(component, 'expense')).toContain('25');

        isDeleted = true;
        component.deleteTransaction('expense-transaction');

        expect(summaryCardValue(component, 'expense')).not.toContain('25');

        vi.useRealTimers();
    });

    it('does not delete unknown transaction rows directly', () => {
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
        };
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff8fab',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));
        homeApi.getTransactions.mockReturnValue(
            of(
                page<TransactionResponse>([
                    transaction('expense-transaction', account, expenseCategory, -25),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.deleteTransaction('missing-transaction');

        expect(homeApi.deleteTransaction).not.toHaveBeenCalled();
    });

    it('does not delete transfer transaction rows individually', () => {
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
        };
        const transferCategory: CategoryResponse = {
            id: 'transfer-expense',
            name: 'Transfer out',
            type: 'TransferExpense',
            color: '#67a6c1',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getTransactions.mockReturnValue(
            of(
                page<TransactionResponse>([
                    transaction('transfer-transaction', account, transferCategory, -25),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.deleteTransaction('transfer-transaction');

        expect(homeApi.deleteTransaction).not.toHaveBeenCalled();
    });

    it('opens the edit dialog from the rendered transaction action', () => {
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Main account',
            currencyCode: 'BYN',
            currentBalance: 0,
            color: '#23c78b',
            isArchived: false,
        };
        const expenseCategory: CategoryResponse = {
            id: 'expense-category',
            name: 'Food',
            type: 'Debit',
            color: '#ff8fab',
        };

        homeApi.getAccounts.mockReturnValue(of(page<AccountResponse>([account])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([expenseCategory])));
        homeApi.getTransactions.mockReturnValue(
            of(
                page<TransactionResponse>([
                    transaction('expense-transaction', account, expenseCategory, -25),
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('[data-testid="edit-transaction"]')?.click();
        fixture.detectChanges();

        expect(host.querySelector('.dialog')).not.toBeNull();
        expect(host.textContent ?? '').toContain('Редактировать транзакцию');
        expect(fixture.componentInstance.transactionDraft()).toEqual({
            type: 'expense',
            accountId: 'main-account',
            categoryId: 'expense-category',
            amount: 25,
            date: '2026-06-05T12:00',
            description: 'Food',
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

    it('does not dismiss a loading error after the page is destroyed', () => {
        vi.useFakeTimers();
        homeApi.getAccounts.mockReturnValue(throwError(() => new Error('network')));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;
        const initialError = component.errorMessage();

        component.dismissError();
        fixture.destroy();

        vi.advanceTimersByTime(220);

        expect(component.errorMessage()).toBe(initialError);

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
        fixture.componentInstance.setActiveTab('categories');

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

    it('ignores unknown tag/category assignment changes without calling the backend', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));
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
        fixture.componentInstance.setActiveTab('categories');
        homeApi.assignTagCategories.mockClear();

        fixture.componentInstance.assignCategoryToTag({
            tagId: 'tag-id',
            categoryId: 'missing-category',
        });
        fixture.componentInstance.assignCategoryToTag({
            tagId: 'missing-tag',
            categoryId: 'food-id',
        });
        fixture.componentInstance.removeCategoryFromTag({
            tagId: 'tag-id',
            categoryId: 'missing-category',
        });
        fixture.componentInstance.removeCategoryFromTag({
            tagId: 'missing-tag',
            categoryId: 'food-id',
        });

        expect(homeApi.assignTagCategories).not.toHaveBeenCalled();
    });

    it('ignores direct deletes for unknown tags', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));
        homeApi.getTags.mockReturnValue(
            of(page<TagResponse>([{ id: 'tag-id', name: 'Essentials', color: '#23c78b' }])),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        fixture.componentInstance.setActiveTab('categories');
        homeApi.deleteTag.mockClear();

        fixture.componentInstance.deleteTag('missing-tag');

        expect(homeApi.deleteTag).not.toHaveBeenCalled();
    });

    it('does not reassign a category that is already linked to a tag', () => {
        const linkedCategory: CategoryResponse = {
            id: 'food-id',
            name: 'Food',
            type: 'Debit',
            color: '#ff6f91',
        };

        homeApi.getAccounts.mockReturnValue(of(page([account()])));
        homeApi.getCategories.mockReturnValue(of(page<CategoryResponse>([linkedCategory])));
        homeApi.getTags.mockReturnValue(
            of(page<TagResponse>([{ id: 'tag-id', name: 'Essentials', color: '#23c78b' }])),
        );
        homeApi.getTagById.mockReturnValue(
            of<TagDetailsResponse>({
                id: 'tag-id',
                name: 'Essentials',
                color: '#23c78b',
                isDeleted: false,
                categories: [
                    {
                        id: linkedCategory.id,
                        name: linkedCategory.name,
                        color: linkedCategory.color,
                        type: linkedCategory.type,
                        isDeleted: false,
                    },
                ],
            }),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        fixture.componentInstance.setActiveTab('categories');
        homeApi.assignTagCategories.mockClear();

        fixture.componentInstance.assignCategoryToTag({
            tagId: 'tag-id',
            categoryId: 'food-id',
        });

        expect(homeApi.assignTagCategories).not.toHaveBeenCalled();
    });

    it('ignores direct deletes for system or unknown categories', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));
        homeApi.getCategories.mockReturnValue(
            of(
                page<CategoryResponse>([
                    {
                        id: 'system-category',
                        name: 'System',
                        type: 'Debit',
                        color: '#67a6c1',
                        isSystem: true,
                    },
                    {
                        id: 'food-id',
                        name: 'Food',
                        type: 'Debit',
                        color: '#ff6f91',
                        isSystem: false,
                    },
                ]),
            ),
        );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        fixture.componentInstance.setActiveTab('categories');

        fixture.componentInstance.deleteCategory('system-category');
        fixture.componentInstance.deleteCategory('missing-category');

        expect(homeApi.deleteCategory).not.toHaveBeenCalled();
    });

    it('refreshes loaded tag data after deleting a category without reloading the whole dashboard', () => {
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
        fixture.componentInstance.setActiveTab('categories');

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialTransactionCalls = homeApi.getTransactions.mock.calls.length;
        const initialBalanceCalls = homeApi.getMonthBalance.mock.calls.length;
        const initialTagCalls = homeApi.getTags.mock.calls.length;
        homeApi.getCategories.mockClear();

        fixture.componentInstance.deleteCategory('food-id');

        expect(homeApi.deleteCategory).toHaveBeenCalledWith('food-id');
        expect(homeApi.getCategories).toHaveBeenCalledTimes(1);
        expect(homeApi.getTags.mock.calls.length).toBe(initialTagCalls + 1);
        expect(homeApi.getAccounts.mock.calls.length).toBe(initialAccountCalls);
        expect(homeApi.getTransactions.mock.calls.length).toBe(initialTransactionCalls);
        expect(homeApi.getMonthBalance.mock.calls.length).toBe(initialBalanceCalls);
    });

    it('does not apply stale tag details while a newer tag refresh is queued', () => {
        const staleTagDetails$ = new Subject<TagDetailsResponse>();
        const freshTagDetails$ = new Subject<TagDetailsResponse>();

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
        homeApi.getTagById
            .mockReturnValueOnce(staleTagDetails$.asObservable())
            .mockReturnValueOnce(freshTagDetails$.asObservable());

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        fixture.componentInstance.setActiveTab('categories');

        expect(homeApi.getTagById).toHaveBeenCalledTimes(1);

        fixture.componentInstance.deleteCategory('food-id');

        staleTagDetails$.next({
            id: 'tag-id',
            name: 'Essentials',
            color: '#23c78b',
            isDeleted: false,
            categories: [
                {
                    id: 'food-id',
                    name: 'Food',
                    color: '#ff6f91',
                    type: 'Debit',
                    isDeleted: false,
                },
            ],
        });
        staleTagDetails$.complete();

        expect(homeApi.getTagById).toHaveBeenCalledTimes(2);
        expect(fixture.componentInstance.tagGroups().flatMap((tag) => tag.categories)).toEqual([]);

        freshTagDetails$.next({
            id: 'tag-id',
            name: 'Essentials',
            color: '#23c78b',
            isDeleted: false,
            categories: [],
        });
        freshTagDetails$.complete();

        expect(fixture.componentInstance.tagGroups()[0]?.categories).toEqual([]);
    });

    it('does not start a queued tag refresh after the page is destroyed', () => {
        const staleTagDetails$ = new Subject<TagDetailsResponse>();

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
        homeApi.getTagById.mockReturnValue(staleTagDetails$.asObservable());

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        fixture.componentInstance.setActiveTab('categories');

        expect(homeApi.getTags).toHaveBeenCalledTimes(1);
        expect(homeApi.getTagById).toHaveBeenCalledTimes(1);

        fixture.componentInstance.deleteCategory('food-id');
        fixture.destroy();

        expect(homeApi.getTags).toHaveBeenCalledTimes(1);
        expect(homeApi.getTagById).toHaveBeenCalledTimes(1);
    });

    it('refreshes categories after creating a category without reloading the whole dashboard', () => {
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
        fixture.componentInstance.setActiveTab('categories');

        const initialAccountCalls = homeApi.getAccounts.mock.calls.length;
        const initialTransactionCalls = homeApi.getTransactions.mock.calls.length;
        const initialBalanceCalls = homeApi.getMonthBalance.mock.calls.length;
        const initialTagCalls = homeApi.getTags.mock.calls.length;
        homeApi.getCategories.mockClear();

        fixture.componentInstance.setNewExpenseCategory('Bills');
        fixture.componentInstance.setNewExpenseCategoryColor('#e8b45d');
        fixture.componentInstance.addExpenseCategory();

        expect(homeApi.createCategory).toHaveBeenCalledWith({
            name: 'Bills',
            type: 'Debit',
            color: '#e8b45d',
        });
        expect(homeApi.getCategories).toHaveBeenCalledTimes(1);
        expect(homeApi.getTags.mock.calls.length).toBe(initialTagCalls + 1);
        expect(homeApi.getAccounts.mock.calls.length).toBe(initialAccountCalls);
        expect(homeApi.getTransactions.mock.calls.length).toBe(initialTransactionCalls);
        expect(homeApi.getMonthBalance.mock.calls.length).toBe(initialBalanceCalls);
    });

    it('ignores unsupported category color values', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.setActiveTab('categories');
        component.setNewExpenseCategory('Bills');
        component.setNewExpenseCategoryColor('url(https://example.test/tracker)');
        component.addExpenseCategory();

        expect(homeApi.createCategory).toHaveBeenCalledWith({
            name: 'Bills',
            type: 'Debit',
            color: '#ff6f91',
        });
    });

    it('keeps the newest categories when category refresh responses resolve out of order', () => {
        const staleCategoryRefresh$ = new Subject<PagedResponse<CategoryResponse>>();
        const billsCategory: CategoryResponse = {
            id: 'bills-id',
            name: 'Bills',
            type: 'Debit',
            color: '#ff6f91',
            isSystem: false,
        };

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
                        isPrimary: true,
                    },
                ]),
            ),
        );
        homeApi.getCategories
            .mockReturnValueOnce(of(page<CategoryResponse>([billsCategory])))
            .mockReturnValueOnce(staleCategoryRefresh$.asObservable())
            .mockReturnValueOnce(of(page<CategoryResponse>([])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        fixture.componentInstance.setActiveTab('categories');

        fixture.componentInstance.setNewExpenseCategory('Bills');
        fixture.componentInstance.addExpenseCategory();

        expect(homeApi.getCategories).toHaveBeenCalledTimes(2);

        fixture.componentInstance.deleteCategory('bills-id');

        expect(homeApi.getCategories).toHaveBeenCalledTimes(3);
        expect(
            fixture.componentInstance.expenseCategories().map((category) => category.name),
        ).not.toContain('Bills');

        staleCategoryRefresh$.next(page<CategoryResponse>([billsCategory]));
        staleCategoryRefresh$.complete();

        expect(
            fixture.componentInstance.expenseCategories().map((category) => category.name),
        ).not.toContain('Bills');
    });

    it('creates a tag with the selected color', () => {
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

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        fixture.componentInstance.setNewTagGroup('Subscriptions');
        fixture.componentInstance.setNewTagGroupColor('#e8b45d');
        fixture.componentInstance.addTagGroup();

        expect(homeApi.createTag).toHaveBeenCalledWith({
            name: 'Subscriptions',
            color: '#e8b45d',
        });
    });

    it('ignores unsupported tag color values', () => {
        homeApi.getAccounts.mockReturnValue(of(page([account()])));

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.setNewTagGroup('Subscriptions');
        component.setNewTagGroupColor('linear-gradient(red, blue)');
        component.addTagGroup();

        expect(homeApi.createTag).toHaveBeenCalledWith({
            name: 'Subscriptions',
            color: '#67a6c1',
        });
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

        expect(authService.logout).toHaveBeenCalledWith();
        expect(authStore.clearSession).toHaveBeenCalledOnce();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
    });
});
