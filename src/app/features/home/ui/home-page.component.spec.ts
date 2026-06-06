import { signal, WritableSignal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
        userName: WritableSignal<string | null>;
        isAuthenticated: WritableSignal<boolean>;
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
        deleteAccount: ReturnType<typeof vi.fn>;
        createTransaction: ReturnType<typeof vi.fn>;
        deleteTransaction: ReturnType<typeof vi.fn>;
        createTransfer: ReturnType<typeof vi.fn>;
        getTransferRate: ReturnType<typeof vi.fn>;
        assignTagCategories: ReturnType<typeof vi.fn>;
    };
    let router: {
        navigateByUrl: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
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
            createTransaction: vi.fn(() => of('transaction-id')),
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
        deleteButtons[0].click();

        expect(homeApi.deleteAccount).toHaveBeenCalledWith('secondary-account');
        expect(homeApi.getAccounts.mock.calls.length).toBeGreaterThan(initialAccountCalls);
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

    it('converts dashboard totals to the primary account currency', () => {
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
        homeApi.getMonthBalance.mockImplementation((accountId: string, year: number, month: number) =>
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

        const balanceCard = fixture
            .componentInstance.summaryCards()
            .find((card) => card.id === 'balance');

        expect(homeApi.getTransferRate).toHaveBeenCalledWith('usd-account', 'byn-account');
        expect(balanceCard?.value).toContain('25');
        expect(balanceCard?.value).toContain('Br');
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

        const balanceCard = fixture
            .componentInstance.summaryCards()
            .find((card) => card.id === 'balance');

        expect(balanceCard?.value).toContain('Br');
        expect(balanceCard?.value).not.toContain('$');
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
