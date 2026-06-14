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
    readonly expandedTransactionId = signal<string | null>(null);

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
    readonly pageLabel = computed(() => `${this.currentPageIndex() + 1} / ${this.totalPages()}`);
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

        if (this.isServerPaginated()) {
            this.pageChange.emit(this.currentPageIndex());
            return;
        }

        this.pageIndex.update((page) => Math.max(0, page - 1));
    }

    goToNextPage(): void {
        if (!this.canGoToNextPage()) {
            return;
        }

        if (this.isServerPaginated()) {
            this.pageChange.emit(this.currentPageIndex() + 2);
            return;
        }

        this.pageIndex.update((page) => Math.min(this.totalPages() - 1, page + 1));
    }

    toggleTransactionDetails(transactionId: string): void {
        this.expandedTransactionId.update((current) =>
            current === transactionId ? null : transactionId,
        );
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
