import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { TransactionItem, TransactionPagination } from '../../home-page.models';
import { TransactionJournalRowsComponent } from './transaction-journal-rows/transaction-journal-rows.component';

type TransactionSortKey = 'date' | 'title' | 'account' | 'category' | 'amount';
type SortDirection = 'asc' | 'desc';
type PaginationItem = number | null;

@Component({
    selector: 'ms-transaction-journal',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        Button,
        InputComponent,
        SelectComponent,
        TransactionJournalRowsComponent,
    ],
    templateUrl: './transaction-journal.component.html',
    styleUrls: [
        './transaction-journal.component.css',
        './transaction-journal.part-2.css',
        './transaction-journal.part-3.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionJournalComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);

    transactions = input.required<ReadonlyArray<TransactionItem>>();
    searchControl = input.required<FormControl<string>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedAccountId = input.required<string>();
    pageSize = input(25);
    pagination = input<TransactionPagination | null>(null);
    pageSizeOptions = input<ReadonlyArray<MsSelectOption>>([]);
    saving = input(false);

    editTransaction = output<TransactionItem>();
    deleteTransaction = output<string>();
    accountChange = output<string>();
    pageSizeChange = output<number>();
    pageChange = output<number>();

    readonly sortKey = signal<TransactionSortKey>('date');
    readonly sortDirection = signal<SortDirection>('desc');
    readonly pageIndex = signal(0);
    readonly searchQuery = signal('');

    readonly sortedTransactions = computed(() => {
        const direction = this.sortDirection() === 'asc' ? 1 : -1;
        const key = this.sortKey();

        return [...this.transactions()].sort((left, right) => {
            const result = compareTransactions(left, right, key);

            if (result !== 0) {
                return result * direction;
            }

            return compareTransactions(left, right, 'date') * -1;
        });
    });

    readonly isServerPaginated = computed(() => this.pagination() !== null);
    readonly totalPages = computed(() => {
        const pagination = this.pagination();

        if (pagination) {
            return Math.max(1, pagination.totalPages);
        }

        return Math.max(1, Math.ceil(this.sortedTransactions().length / this.pageSize()));
    });
    readonly currentPageIndex = computed(() => {
        const pagination = this.pagination();
        const maxPageIndex = Math.max(0, this.totalPages() - 1);

        if (pagination) {
            return Math.min(Math.max(0, pagination.page - 1), maxPageIndex);
        }

        return Math.min(this.pageIndex(), maxPageIndex);
    });
    readonly pagedTransactions = computed(() => {
        if (this.isServerPaginated()) {
            return this.sortedTransactions();
        }

        const pageSize = this.pageSize();
        const start = this.currentPageIndex() * pageSize;

        return this.sortedTransactions().slice(start, start + pageSize);
    });
    readonly totalItems = computed(
        () => this.pagination()?.totalCount ?? this.sortedTransactions().length,
    );
    readonly pageLabel = computed(
        () => `Страница ${this.currentPageIndex() + 1} из ${this.totalPages()}`,
    );
    readonly paginationItems = computed<ReadonlyArray<PaginationItem>>(() =>
        createPaginationItems(this.currentPageIndex() + 1, this.totalPages()),
    );
    readonly rangeLabel = computed(() => {
        const totalItems = this.totalItems();

        if (!totalItems) {
            return 'Нет операций';
        }

        const pageSize = Math.max(1, this.pagination()?.size ?? this.pageSize());
        const firstItem = this.currentPageIndex() * pageSize + 1;
        const visibleItems = Math.max(1, this.pagedTransactions().length);
        const lastItem = Math.min(firstItem + visibleItems - 1, totalItems);

        return firstItem === lastItem
            ? `Показано ${firstItem} из ${totalItems}`
            : `Показано ${firstItem}–${lastItem} из ${totalItems}`;
    });
    readonly showPagination = computed(
        () => this.totalPages() > 1 || (this.isServerPaginated() && this.totalItems() > 0),
    );
    readonly canGoToPreviousPage = computed(() => this.currentPageIndex() > 0);
    readonly canGoToNextPage = computed(() => this.currentPageIndex() < this.totalPages() - 1);

    ngOnInit(): void {
        const control = this.searchControl();

        this.searchQuery.set(control.value);
        control.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => this.searchQuery.set(value ?? ''));
    }

    changeSort(key: TransactionSortKey): void {
        if (this.sortKey() === key) {
            this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
        } else {
            this.sortKey.set(key);
            this.sortDirection.set(key === 'date' || key === 'amount' ? 'desc' : 'asc');
        }

        this.pageIndex.set(0);
    }

    goToPreviousPage(): void {
        if (!this.canGoToPreviousPage()) {
            return;
        }

        this.goToPage(this.currentPageIndex());
    }

    goToNextPage(): void {
        if (!this.canGoToNextPage()) {
            return;
        }

        this.goToPage(this.currentPageIndex() + 2);
    }

    goToPage(page: number): void {
        if (!Number.isFinite(page)) {
            return;
        }

        const nextPage = Math.min(Math.max(1, Math.trunc(page)), this.totalPages());

        if (nextPage === this.currentPageIndex() + 1) {
            return;
        }

        if (this.isServerPaginated()) {
            this.pageChange.emit(nextPage);
            return;
        }

        this.pageIndex.set(nextPage - 1);
    }

    onPageSizeChange(value: string): void {
        const nextSize = Number(value);

        if (!Number.isFinite(nextSize) || nextSize <= 0) {
            return;
        }

        this.pageIndex.set(0);
        this.pageSizeChange.emit(nextSize);
    }

    sortIcon(key: TransactionSortKey): string {
        if (this.sortKey() !== key) {
            return 'unfold_more';
        }

        return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
    }

    hasActiveFilters(): boolean {
        const selectedAccountId = this.selectedAccountId();

        return !!this.searchQuery().trim() || (!!selectedAccountId && selectedAccountId !== 'all');
    }
}

function createPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, null, totalPages];
    }

    if (currentPage >= totalPages - 3) {
        return [
            1,
            null,
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages];
}

function compareTransactions(
    left: TransactionItem,
    right: TransactionItem,
    key: TransactionSortKey,
): number {
    switch (key) {
        case 'date':
            return left.timestamp - right.timestamp;
        case 'title':
            return left.title.localeCompare(right.title, 'ru');
        case 'account':
            return left.accountName.localeCompare(right.accountName, 'ru');
        case 'category':
            return left.category.localeCompare(right.category, 'ru');
        case 'amount':
            return left.amountValue - right.amountValue;
    }
}
