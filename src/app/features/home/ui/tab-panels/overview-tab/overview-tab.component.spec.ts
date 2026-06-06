import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { TransactionItem } from '../../home-page.models';
import { OverviewTabComponent } from './overview-tab.component';

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
        description: '',
        amountLabel: '-10,00 Br',
        amountValue: 10,
        tone: 'expense',
        ...overrides,
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

    it('paginates transactions in compact pages', () => {
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
