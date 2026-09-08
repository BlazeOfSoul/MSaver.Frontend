import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import {
    AccountResponse,
    CategoryResponse,
    PagedResponse,
    TransactionResponse,
} from '../data-access/home-api.models';
import { HomeApiService } from '../data-access/home-api.service';
import { HomeDashboardStore } from './home-dashboard.store';
import { AnalyticsMonthTableComponent } from './components/analytics-month-table/analytics-month-table.component';

const mainAccount: AccountResponse = {
    id: 'main',
    name: 'Основной счёт',
    currencyCode: 'BYN',
    currentBalance: 1000,
    color: '#23c78b',
    isPrimary: true,
    isArchived: false,
};
const otherAccount: AccountResponse = { ...mainAccount, id: 'other', isPrimary: false };
const categories: CategoryResponse[] = [
    { id: 'given', name: 'Дано в долг (-)', type: 'Debit', color: '#23c78b', isSystem: false },
    {
        id: 'received',
        name: 'Отдано по долгу (+)',
        type: 'Credit',
        color: '#23c78b',
        isSystem: false,
    },
    { id: 'taken', name: 'Взято в долг (+)', type: 'Credit', color: '#23c78b', isSystem: false },
    {
        id: 'returned',
        name: 'Возвращено по долгу (-)',
        type: 'Debit',
        color: '#23c78b',
        isSystem: false,
    },
    { id: 'food', name: 'Продукты', type: 'Debit', color: '#23c78b', isSystem: false },
];

function page<T>(items: T[], pageNumber = 1, size = 100): PagedResponse<T> {
    const totalPages = Math.ceil(items.length / size);

    return {
        items: items.slice((pageNumber - 1) * size, pageNumber * size),
        page: pageNumber,
        size,
        totalCount: items.length,
        totalPages,
        hasPreviousPage: pageNumber > 1,
        hasNextPage: pageNumber < totalPages,
    };
}

function transaction(
    id: string,
    categoryId: string,
    amount: number,
    date: string,
    account = mainAccount,
): TransactionResponse {
    return {
        id,
        category: categories.find((category) => category.id === categoryId)!,
        account,
        amount,
        date,
        description: id,
    };
}

describe('HomeDashboardStore debt history', () => {
    let transactions: TransactionResponse[];
    let store: HomeDashboardStore;
    let api: {
        getAccounts: ReturnType<typeof vi.fn>;
        getCurrentUser: ReturnType<typeof vi.fn>;
        getCategories: ReturnType<typeof vi.fn>;
        getCategoryOrder: ReturnType<typeof vi.fn>;
        getTransactions: ReturnType<typeof vi.fn>;
        getMonthBalance: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 8, 15, 12));
        window.localStorage.clear();
        transactions = [];
        api = {
            getAccounts: vi.fn(() => of(page([mainAccount, otherAccount]))),
            getCurrentUser: vi.fn(() =>
                of({
                    id: 'user',
                    username: 'User',
                    email: 'user@example.com',
                    applicationCurrencyCode: 'BYN',
                }),
            ),
            getCategories: vi.fn(() => of(page(categories))),
            getCategoryOrder: vi.fn(() => of({ categoryIds: [] })),
            getTransactions: vi.fn((query: Parameters<HomeApiService['getTransactions']>[0]) => {
                const matching = transactions.filter((item) => {
                    const timestamp = new Date(item.date).getTime();

                    return (
                        (!query.categoryId || item.category.id === query.categoryId) &&
                        (!query.accountId || item.account.id === query.accountId) &&
                        (!query.fromDate || timestamp >= new Date(query.fromDate).getTime()) &&
                        timestamp < new Date(query.toDate).getTime()
                    );
                });

                // Small pages exercise pagination for annual and historical debt queries.
                return of(page(matching, query.page ?? 1, query.size ?? 2));
            }),
            getMonthBalance: vi.fn((accountId: string, year: number, month: number) =>
                of({
                    accountId,
                    year,
                    month,
                    openingBalance: 1000,
                    monthChange: 0,
                    closingBalance: 1000,
                }),
            ),
        };
        TestBed.configureTestingModule({
            imports: [AnalyticsMonthTableComponent],
            providers: [HomeDashboardStore, { provide: HomeApiService, useValue: api }],
        });
        store = TestBed.inject(HomeDashboardStore);
    });

    afterEach(() => {
        vi.useRealTimers();
        window.localStorage.clear();
    });

    it('shows zero in the annual total after loans are fully repaid in different months', () => {
        transactions = [
            transaction('july-loan', 'given', -40, '2026-07-10T12:00:00'),
            transaction('august-payback', 'received', 40, '2026-08-02T12:00:00'),
            transaction('september-loan', 'given', -70, '2026-09-01T12:00:00'),
            transaction('september-payback', 'received', 70, '2026-09-05T12:00:00'),
        ];

        store.loadDashboard();

        const table = store.categoryMonthTable();
        const owedToMe = table.debtRows?.find((row) => row.id === 'owed-to-me');
        expect(owedToMe?.cells.map((cell) => cell.value)).toEqual([
            0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0,
        ]);
        expect(owedToMe?.totalValue).toBe(0);
        expect(owedToMe?.formattedTotal).toBe('0,00 Br');
        expect(table.debtSummary?.totalValue).toBe(0);
        expect(table.debtSummary?.formattedTotal).toBe('0,00 Br');
        expect(store.debtSummary().owedToMe).toBe(0);

        const fixture = TestBed.createComponent(AnalyticsMonthTableComponent);
        fixture.componentRef.setInput('title', 'Долги');
        fixture.componentRef.setInput('rowHeader', 'Долг');
        fixture.componentRef.setInput('emptyText', 'Долгов за выбранный год пока нет.');
        fixture.componentRef.setInput('months', table.months);
        fixture.componentRef.setInput('rows', table.debtRows);
        fixture.componentRef.setInput('summary', table.debtSummary);
        fixture.detectChanges();
        const totalCells = (fixture.nativeElement as HTMLElement).querySelectorAll(
            '[data-label="Итого"]',
        );
        expect(Array.from(totalCells, (cell) => cell.textContent?.trim())).toEqual([
            '0,00 Br',
            '0,00 Br',
        ]);
    });

    it('carries earlier debts into January and closes them after partial repayments across the year', () => {
        transactions = [
            transaction('old-loan-1', 'given', -40, '2025-09-10T12:00:00'),
            transaction('old-loan-2', 'given', -30, '2025-10-10T12:00:00'),
            transaction('old-loan-3', 'given', -40, '2025-12-10T12:00:00'),
            transaction('old-borrowed', 'taken', 90, '2025-11-10T12:00:00'),
            transaction('january-payback', 'received', 40, '2026-01-05T12:00:00'),
            transaction('july-payback', 'received', 70, '2026-07-05T12:00:00'),
            transaction('march-return', 'returned', -30, '2026-03-05T12:00:00'),
            transaction('september-return', 'returned', -60, '2026-09-05T12:00:00'),
            transaction('old-groceries', 'food', -999, '2025-12-05T12:00:00'),
            transaction('new-groceries', 'food', -20, '2026-09-05T12:00:00'),
        ];

        store.loadDashboard();

        const table = store.categoryMonthTable();
        const owedToMe = table.debtRows?.find((row) => row.id === 'owed-to-me');
        const owedByMe = table.debtRows?.find((row) => row.id === 'owed-by-me');
        expect(owedToMe?.cells.map((cell) => cell.value)).toEqual([
            70, 70, 70, 70, 70, 70, 0, 0, 0, 0, 0, 0,
        ]);
        expect(owedByMe?.cells.map((cell) => cell.value)).toEqual([
            90, 90, 60, 60, 60, 60, 60, 60, 0, 0, 0, 0,
        ]);
        expect(owedToMe?.totalValue).toBe(0);
        expect(owedByMe?.totalValue).toBe(0);
        expect(table.debtSummary?.totalValue).toBe(0);
        expect(table.expenseSummary?.totalValue).toBe(20);
        expect(store.debtSummary()).toEqual({
            owedByMe: 0,
            owedToMe: 0,
            balanceAfterClosing: 1000,
        });
        expect(api.getTransactions).toHaveBeenCalledWith({
            categoryId: 'given',
            toDate: new Date(2026, 0, 1).toISOString(),
            page: 2,
        });
        expect(
            api.getTransactions.mock.calls
                .filter(([query]) => !query.fromDate)
                .every(([query]) =>
                    ['given', 'received', 'taken', 'returned'].includes(query.categoryId),
                ),
        ).toBe(true);

        for (let month = 0; month < 8; month++) {
            store.goToPreviousMonth();
        }
        expect(store.debtSummary()).toEqual({
            owedByMe: 90,
            owedToMe: 70,
            balanceAfterClosing: 980,
        });
    });

    it('includes outstanding debts without current-year activity and preserves the account filter', () => {
        transactions = [
            transaction('main-old-loan', 'given', -70, '2025-12-10T12:00:00'),
            transaction('other-old-loan', 'given', -30, '2025-12-10T12:00:00', otherAccount),
            transaction('other-payback', 'received', 30, '2026-08-10T12:00:00', otherAccount),
        ];

        store.loadDashboard();

        expect(store.debtSummary().owedToMe).toBe(70);
        expect(store.categoryMonthTable().debtSummary?.totalValue).toBe(70);
        store.analyticsSelectedAccountId.set('other');
        expect(store.categoryMonthTable().debtSummary?.totalValue).toBe(0);
        store.analyticsSelectedAccountId.set('main');
        expect(store.categoryMonthTable().debtSummary?.totalValue).toBe(70);
    });

    it('shares the pending category request with debt history before displaying totals', () => {
        const pendingCategories = new Subject<PagedResponse<CategoryResponse>>();
        api.getCategories.mockReturnValue(pendingCategories.asObservable());
        transactions = [transaction('old-loan', 'given', -70, '2025-12-10T12:00:00')];

        store.loadDashboard();

        expect(api.getCategories).toHaveBeenCalledTimes(1);
        expect(store.isLoading()).toBe(false);
        expect(store.historyReady()).toBe(false);
        pendingCategories.next(page(categories));
        pendingCategories.complete();
        expect(store.isLoading()).toBe(false);
        expect(store.debtSummary().owedToMe).toBe(70);
        expect(api.getCategories).toHaveBeenCalledTimes(1);
    });
});
