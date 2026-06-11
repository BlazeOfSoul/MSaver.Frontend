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
        createTag: ReturnType<typeof vi.fn>;
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
            createTag: vi.fn(() => of('tag-id')),
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

    it('loads 25 latest transactions by default for the overview journal', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, size: 25 }),
        );
    });

    it('loads the remembered transaction count for the overview journal', () => {
        window.localStorage.setItem('msaver:overview-transaction-count', '50');

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, size: 50 }),
        );
    });

    it('persists transaction count changes and reloads the overview journal', () => {
        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        homeApi.getTransactions.mockClear();

        fixture.componentInstance.setTransactionPageSize(100);

        expect(window.localStorage.getItem('msaver:overview-transaction-count')).toBe('100');
        expect(homeApi.getTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, size: 100 }),
        );
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

    it('shows balance after closing debt categories in summary cards', () => {
        const account: AccountResponse = {
            id: 'main-account',
            name: 'Основной счёт',
            currencyCode: 'BYN',
            currentBalance: 1000,
            color: '#23c78b',
            isArchived: false,
            isPrimary: true,
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

        homeApi.getAccounts.mockReturnValue(of(page([account])));
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

        expect(debtCard?.value).toContain('950');
        expect(debtCard?.value).toContain('Br');
        expect(debtCard?.helper).toBe('Баланс после закрытия долгов');
        expect(debtCard?.helperLines).toHaveLength(2);
        expect(debtCard?.helperLines?.[0]).toContain('200');
        expect(debtCard?.helperLines?.[1]).toContain('150');
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
        expect(balanceCard?.value).toContain('10');
        expect(balanceCard?.value).toContain('Br');
        expect(fixture.componentInstance.accountSummaryBalanceLabel()).toContain('7,50');
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

    it('saves application currency changes from settings and reloads dashboard data', () => {
        homeApi.getCurrentUser
            .mockReturnValueOnce(
                of<CurrentUserResponse>({
                    id: 'user-123',
                    username: 'Alex',
                    email: 'alex@example.com',
                    applicationCurrencyCode: 'BYN',
                }),
            )
            .mockReturnValue(
                of<CurrentUserResponse>({
                    id: 'user-123',
                    username: 'Alex',
                    email: 'alex@example.com',
                    applicationCurrencyCode: 'JPY',
                }),
            );

        fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();

        const initialUserCalls = homeApi.getCurrentUser.mock.calls.length;

        fixture.componentInstance.updateApplicationCurrency('JPY');

        expect(homeApi.updateApplicationCurrency).toHaveBeenCalledWith({
            applicationCurrencyCode: 'JPY',
        });
        expect(homeApi.getCurrentUser.mock.calls.length).toBeGreaterThan(initialUserCalls);
        expect(fixture.componentInstance.applicationCurrencyCode()).toBe('JPY');
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
