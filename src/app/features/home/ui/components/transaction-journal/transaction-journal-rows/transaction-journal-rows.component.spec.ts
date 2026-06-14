import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { TransactionItem } from '../../../home-page.models';
import { TransactionJournalRowsComponent } from './transaction-journal-rows.component';

function transaction(overrides: Partial<TransactionItem>): TransactionItem {
    return {
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
}

@Component({
    standalone: true,
    imports: [TransactionJournalRowsComponent],
    template: `
        <table>
            <tbody
                ms-transaction-journal-rows
                [transactions]="transactions()"
                [expandedTransactionId]="expandedTransactionId()"
                [saving]="saving()"
                (toggleDetails)="toggleDetails($event)"
                (editTransaction)="editTransaction($event)"
                (deleteTransaction)="deleteTransaction($event)"
            ></tbody>
        </table>
    `,
})
class HostComponent {
    readonly transactions = signal<ReadonlyArray<TransactionItem>>([]);
    readonly expandedTransactionId = signal<string | null>(null);
    readonly saving = signal(false);
    readonly toggleDetails = vi.fn();
    readonly editTransaction = vi.fn();
    readonly deleteTransaction = vi.fn();
}

describe('TransactionJournalRowsComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let hostComponent: HostComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(HostComponent);
        hostComponent = fixture.componentInstance;
    });

    it('renders transaction rows with category color and amount tone', () => {
        hostComponent.transactions.set([
            transaction({
                id: 'income-id',
                title: 'Salary',
                category: 'Salary',
                categoryColor: '#23c78b',
                amountLabel: '+100,00 Br',
                tone: 'income',
            }),
        ]);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const row = host.querySelector<HTMLTableRowElement>('tbody tr');
        const category = host.querySelector<HTMLElement>('.transaction-category');
        const amount = host.querySelector<HTMLElement>('.transactions-table__amount strong');

        expect(row?.textContent ?? '').toContain('Salary');
        expect(category?.style.getPropertyValue('--category-color')).toBe('#23c78b');
        expect(amount?.getAttribute('data-tone')).toBe('income');
    });

    it('renders debt category badges and helper text', () => {
        hostComponent.transactions.set([
            transaction({
                category: 'Мне вернули долг',
                categoryDetail: 'Деньги пришли, мне должны меньше',
                categoryDebtBadge: 'Мне должны',
                categoryColor: '#67a6c1',
                tone: 'income',
            }),
        ]);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const category = host.querySelector<HTMLElement>('.transaction-category');

        expect(category?.textContent).toContain('Мне вернули долг');
        expect(category?.textContent).toContain('Мне должны');
        expect(host.textContent).toContain('Деньги пришли, мне должны меньше');
    });

    it('emits row actions only for editable transactions', () => {
        const editable = transaction({ id: 'editable', title: 'Market' });
        const transfer = transaction({
            id: 'transfer',
            title: 'Transfer',
            categoryType: 'TransferExpense',
        });
        hostComponent.transactions.set([editable, transfer]);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('[data-testid="edit-transaction"]')?.click();
        host.querySelector<HTMLButtonElement>('[data-testid="delete-transaction"]')?.click();
        host.querySelector<HTMLButtonElement>(
            '[data-testid="toggle-transaction-details"]',
        )?.click();

        expect(hostComponent.editTransaction).toHaveBeenCalledWith(editable);
        expect(hostComponent.deleteTransaction).toHaveBeenCalledWith('editable');
        expect(hostComponent.toggleDetails).toHaveBeenCalledWith('editable');
        expect(host.querySelectorAll('[data-testid="edit-transaction"]')).toHaveLength(1);
        expect(host.querySelectorAll('[data-testid="delete-transaction"]')).toHaveLength(1);
    });

    it('renders the expanded transaction details row', () => {
        hostComponent.transactions.set([
            transaction({ id: 'expanded', description: 'Coffee with team' }),
        ]);
        hostComponent.expandedTransactionId.set('expanded');

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.transaction-details-row')).not.toBeNull();
        expect(host.querySelector('.transaction-details__note')).not.toBeNull();
        expect(host.querySelector('.transaction-details__icon')?.textContent?.trim()).toBe('notes');
        expect(host.querySelector('.transaction-details__value')?.textContent).toContain(
            'Coffee with team',
        );
        expect(host.textContent ?? '').toContain('Coffee with team');
    });

    it('renders missing expanded descriptions as muted note text', () => {
        hostComponent.transactions.set([transaction({ id: 'expanded', description: '' })]);
        hostComponent.expandedTransactionId.set('expanded');

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const value = host.querySelector<HTMLElement>('.transaction-details__value');

        expect(value?.classList.contains('transaction-details__value--empty')).toBe(true);
        expect(value?.textContent).toContain('Описание не указано');
    });
});
