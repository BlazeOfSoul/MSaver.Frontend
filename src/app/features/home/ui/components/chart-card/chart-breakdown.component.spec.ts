import { TestBed } from '@angular/core/testing';
import { ChartBreakdownComponent } from './chart-breakdown.component';
import { buildDoughnutBreakdown } from './doughnut-breakdown';

describe('ChartBreakdownComponent', () => {
    it('opens all 30 names, searches the grouped tail and collapses the list', async () => {
        await TestBed.configureTestingModule({
            imports: [ChartBreakdownComponent],
        }).compileComponents();
        const fixture = TestBed.createComponent(ChartBreakdownComponent);
        const labels = Array.from({ length: 30 }, (_, i) =>
            i === 29
                ? 'Очень длинное название категории для проверки отображения целиком'
                : `Категория ${i + 1}`,
        );
        const breakdown = buildDoughnutBreakdown(labels, [
            { label: 'Расходы', data: labels.map((_, i) => 30 - i), color: '#123456' },
        ]);
        fixture.componentRef.setInput('items', breakdown.items);
        fixture.componentRef.setInput('slices', breakdown.slices);
        fixture.componentRef.setInput('total', breakdown.total);
        fixture.componentRef.setInput('unit', 'BYN');
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelectorAll('.breakdown-chip')).toHaveLength(6);
        expect(host.querySelector('.breakdown-list')).toBeNull();
        (host.querySelector('.breakdown-group') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(host.querySelectorAll('li')).toHaveLength(30);
        const search = host.querySelector('input')!;
        search.value = ' ДЛИННОЕ ';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(host.querySelectorAll('li')).toHaveLength(1);
        expect(host.querySelector('li')?.textContent).toContain(labels[29]);
        expect(host.querySelector('li')?.textContent).toContain('1 BYN');
        expect(host.querySelector('li')?.textContent).toContain('<1%');
        search.value = 'несуществующая';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(host.textContent).toContain('Ничего не найдено');
        (host.querySelector('.breakdown-toggle') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(host.querySelector('.breakdown-list')).toBeNull();
    });
});
