import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { TransactionItem } from '../../home-page.models';
import { OverviewTabComponent } from './overview-tab.component';

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

describe('OverviewTabComponent', () => {
    let fixture: ComponentFixture<OverviewTabComponent>;
    let searchControl: FormControl<string>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OverviewTabComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(OverviewTabComponent);
        searchControl = new FormControl('', { nonNullable: true });
        fixture.componentRef.setInput('searchControl', searchControl);
        fixture.componentRef.setInput('accountOptions', [{ value: '', label: 'Все счета' }]);
        fixture.componentRef.setInput('selectedAccountId', '');
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

    it('sorts transactions from the same day by the saved time', () => {
        fixture.componentRef.setInput('transactions', [
            transaction({
                id: 'morning',
                title: 'Morning coffee',
                date: '05.06.2026',
                dateValue: '2026-06-05',
                dateTimeLabel: '05.06.2026, 08:15',
                timestamp: new Date('2026-06-05T08:15:00').getTime(),
            }),
            transaction({
                id: 'evening',
                title: 'Evening market',
                date: '05.06.2026',
                dateValue: '2026-06-05',
                dateTimeLabel: '05.06.2026, 19:40',
                timestamp: new Date('2026-06-05T19:40:00').getTime(),
            }),
        ]);

        fixture.detectChanges();

        const rows = Array.from(
            (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLTableRowElement>('tbody tr'),
        );

        expect(rows[0].textContent ?? '').toContain('Evening market');
        expect(rows[1].textContent ?? '').toContain('Morning coffee');
    });

    it('shows saved time and expands full transaction details', () => {
        fixture.componentRef.setInput('transactions', [
            transaction({
                id: 'detailed',
                title: 'Market',
                description: 'Long description with the full payment context',
                date: '05.06.2026',
                dateValue: '2026-06-05T14:37:00',
                dateTimeLabel: '05.06.2026, 14:37',
                timestamp: new Date('2026-06-05T14:37:00').getTime(),
            }),
        ]);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent ?? '').toContain('05.06.2026, 14:37');
        expect(host.textContent ?? '').not.toContain('Long description with the full payment context');

        host.querySelector<HTMLButtonElement>('[data-testid="toggle-transaction-details"]')?.click();
        fixture.detectChanges();

        expect(host.querySelector('.transaction-details')).not.toBeNull();
        expect(host.textContent ?? '').toContain('Long description with the full payment context');
        expect(host.textContent ?? '').toContain('Main');
        expect(host.textContent ?? '').toContain('Food');
    });

    it('paginates transactions in compact pages', () => {
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

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        let rows = Array.from(host.querySelectorAll<HTMLTableRowElement>('tbody tr'));

        expect(rows).toHaveLength(5);
        expect(rows[0].textContent ?? '').toContain('Operation 7');
        expect(host.querySelector('.pagination__meta')?.textContent ?? '').toContain('1 / 2');

        host.querySelector<HTMLButtonElement>('[data-testid="next-transactions-page"]')?.click();
        fixture.detectChanges();

        rows = Array.from(host.querySelectorAll<HTMLTableRowElement>('tbody tr'));

        expect(rows).toHaveLength(2);
        expect(rows[0].textContent ?? '').toContain('Operation 2');
        expect(host.querySelector('.pagination__meta')?.textContent ?? '').toContain('2 / 2');
    });

    it('uses different empty messages for no transactions and no search results', () => {
        fixture.componentRef.setInput('transactions', []);
        fixture.componentRef.setInput('selectedAccountId', 'all');

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent ?? '').toContain('Операций за этот период нет');

        searchControl.setValue('командировка');
        fixture.detectChanges();

        expect(host.textContent ?? '').toContain('Ничего не найдено');
        expect(host.textContent ?? '').not.toContain('Операций за этот период нет');
    });
});
