import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { TransactionItem } from '../../home-page.models';
import { TransactionJournalComponent } from './transaction-journal.component';

function transaction(overrides: Partial<TransactionItem>): TransactionItem {
    const item: TransactionItem = {
        id: 'transaction-id',
        title: 'Operation',
        category: 'Food',
        categoryId: 'category-id',
        categoryType: 'Debit',
        categoryColor: '#ff6f91',
        accountId: 'account-id',
        accountName: 'Main',
        date: '05.06.2026',
        dateValue: '2026-06-05',
        dateTimeLabel: '05.06.2026, 00:00',
        timestamp: new Date('2026-06-05').getTime(),
        description: '',
        amountLabel: '-10,00 Br',
        amountValue: 10,
        tone: 'expense',
        ...overrides,
    };

    return {
        ...item,
        timestamp: overrides.timestamp ?? new Date(`${item.dateValue}T00:00:00`).getTime(),
    };
}

describe('TransactionJournalComponent', () => {
    let fixture: ComponentFixture<TransactionJournalComponent>;
    let searchControl: FormControl<string>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TransactionJournalComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TransactionJournalComponent);
        searchControl = new FormControl('', { nonNullable: true });
        fixture.componentRef.setInput('transactions', []);
        fixture.componentRef.setInput('searchControl', searchControl);
        fixture.componentRef.setInput('accountOptions', [{ value: 'all', label: 'Все счета' }]);
        fixture.componentRef.setInput('selectedAccountId', 'all');
        fixture.componentRef.setInput('pageSize', 25);
        fixture.componentRef.setInput('pageSizeOptions', [{ value: '25', label: '25' }]);
        fixture.componentRef.setInput('saving', false);
    });

    it('renders transactions as a date-sorted table and applies category colors', () => {
        fixture.componentRef.setInput('transactions', [
            transaction({ id: 'old', title: 'Old', date: '01.06.2026', dateValue: '2026-06-01' }),
            transaction({
                id: 'new',
                title: 'Newest',
                category: 'Salary',
                categoryColor: '#23c78b',
                amountLabel: '+100,00 Br',
                tone: 'income',
                date: '05.06.2026',
                dateValue: '2026-06-05',
            }),
            transaction({
                id: 'middle',
                title: 'Middle',
                date: '03.06.2026',
                dateValue: '2026-06-03',
            }),
        ]);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const rows = Array.from(host.querySelectorAll<HTMLTableRowElement>('tbody tr'));
        const firstCategory = rows[0].querySelector<HTMLElement>('.transaction-category');

        expect(rows).toHaveLength(3);
        expect(rows[0].textContent ?? '').toContain('Newest');
        expect(rows[1].textContent ?? '').toContain('Middle');
        expect(rows[2].textContent ?? '').toContain('Old');
        expect(firstCategory?.style.getPropertyValue('--category-color')).toBe('#23c78b');
    });

    it('emits editable row actions and keeps transfer rows read-only', () => {
        const editSpy = vi.fn();
        const deleteSpy = vi.fn();
        const editable = transaction({ id: 'editable', title: 'Market' });
        const transfer = transaction({
            id: 'transfer',
            title: 'Transfer',
            categoryType: 'TransferExpense',
        });
        fixture.componentRef.setInput('transactions', [editable, transfer]);
        fixture.componentInstance.editTransaction.subscribe(editSpy);
        fixture.componentInstance.deleteTransaction.subscribe(deleteSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('[data-testid="edit-transaction"]')?.click();
        host.querySelector<HTMLButtonElement>('[data-testid="delete-transaction"]')?.click();

        expect(editSpy).toHaveBeenCalledWith(editable);
        expect(deleteSpy).toHaveBeenCalledWith('editable');
        expect(host.querySelectorAll('[data-testid="edit-transaction"]')).toHaveLength(1);
        expect(host.querySelectorAll('[data-testid="delete-transaction"]')).toHaveLength(1);
    });

    it('paginates transactions and resets when the page size changes', () => {
        const pageSizeSpy = vi.fn();
        fixture.componentRef.setInput('pageSize', 5);
        fixture.componentRef.setInput(
            'transactions',
            Array.from({ length: 7 }, (_, index) =>
                transaction({
                    id: `operation-${index + 1}`,
                    title: `Operation ${index + 1}`,
                    date: `0${index + 1}.06.2026`,
                    dateValue: `2026-06-0${index + 1}`,
                }),
            ),
        );
        fixture.componentInstance.pageSizeChange.subscribe(pageSizeSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('[data-testid="next-transactions-page"]')?.click();
        fixture.detectChanges();

        expect(host.querySelector('.pagination__meta')?.textContent ?? '').toContain('2 / 2');

        fixture.componentInstance.onPageSizeChange('10');
        fixture.componentRef.setInput('pageSize', 10);
        fixture.detectChanges();

        expect(pageSizeSpy).toHaveBeenCalledWith(10);
        expect(host.querySelector('.pagination__meta')).toBeNull();
        expect(Array.from(host.querySelectorAll<HTMLTableRowElement>('tbody tr'))).toHaveLength(7);
    });

    it('uses different empty messages for no transactions and filtered results', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent ?? '').toContain('Операций за этот период нет');

        searchControl.setValue('командировка');
        fixture.detectChanges();

        expect(host.textContent ?? '').toContain('Ничего не найдено');
        expect(host.textContent ?? '').not.toContain('Операций за этот период нет');
    });
});
