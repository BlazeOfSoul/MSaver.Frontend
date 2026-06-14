import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsMonthTableComponent } from './analytics-month-table.component';

describe('AnalyticsMonthTableComponent', () => {
    let fixture: ComponentFixture<AnalyticsMonthTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AnalyticsMonthTableComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AnalyticsMonthTableComponent);
        fixture.componentRef.setInput('title', 'Расходы');
        fixture.componentRef.setInput('rowHeader', 'Категория');
        fixture.componentRef.setInput('months', ['Jan', 'Feb']);
        fixture.componentRef.setInput('rows', [
            {
                id: 'food',
                name: 'Food',
                color: '#ff6f91',
                type: 'expense',
                cells: [
                    { label: 'Jan', value: 50, formattedValue: '50 Br' },
                    { label: 'Feb', value: 40, formattedValue: '40 Br' },
                ],
                totalValue: 90,
                formattedTotal: '90 Br',
                averageValue: 45,
                formattedAverage: '45 Br',
            },
        ]);
        fixture.componentRef.setInput('summary', {
            cells: [
                { label: 'Jan', value: 50, formattedValue: '50 Br' },
                { label: 'Feb', value: 40, formattedValue: '40 Br' },
            ],
            totalValue: 90,
            formattedTotal: '90 Br',
            averageValue: 45,
            formattedAverage: '45 Br',
        });
        fixture.componentRef.setInput('emptyText', 'Нет данных');
    });

    it('renders rows, month columns and summary footer', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('h3')?.textContent).toContain('Расходы');
        expect(host.querySelectorAll('thead th')).toHaveLength(5);
        expect(host.textContent ?? '').toContain('Food');
        expect(host.textContent ?? '').toContain('90 Br');
        expect(host.querySelectorAll('[data-testid="month-average"]')).toHaveLength(1);
    });

    it('renders the empty state when rows are empty', () => {
        fixture.componentRef.setInput('rows', []);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.analytics-table')).toBeNull();
        expect(host.textContent ?? '').toContain('Нет данных');
    });
    it('can keep the table shell visible when rows are empty', () => {
        fixture.componentRef.setInput('rows', []);
        fixture.componentRef.setInput('showWhenEmpty', true);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.analytics-table')).not.toBeNull();
        expect(host.querySelector('.analytics-empty')).not.toBeNull();
    });
});
