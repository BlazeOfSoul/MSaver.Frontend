import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
import { ChartCardComponent } from './chart-card.component';
import { By } from '@angular/platform-browser';
import { ChartBreakdownComponent } from './chart-breakdown.component';

describe('ChartCardComponent', () => {
    let fixture: ComponentFixture<ChartCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChartCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ChartCardComponent);
    });

    it('uses the shared category palette when no dataset color is available', () => {
        expect(fixture.componentInstance.legendColor(2)).toBe(MS_CATEGORY_COLORS[2]);
        expect(fixture.componentInstance.legendColor(MS_CATEGORY_COLORS.length + 1)).toBe(
            MS_CATEGORY_COLORS[1],
        );
    });

    it('shows a zero account balance as valid data while keeping empty doughnuts in the empty state', () => {
        fixture.componentRef.setInput('datasets', [
            { label: 'Balance', data: [0], color: '#23c78b' },
        ]);
        fixture.componentRef.setInput('type', 'bar');
        expect(fixture.componentInstance.hasData).toBe(true);
        fixture.componentRef.setInput('type', 'doughnut');
        expect(fixture.componentInstance.hasData).toBe(false);
    });

    it('updates legend amounts, currency and percentages when the selected data changes', () => {
        fixture.componentRef.setInput('title', 'Расходы');
        fixture.componentRef.setInput('subtitle', 'За месяц');
        fixture.componentRef.setInput('type', 'doughnut');
        fixture.componentRef.setInput('labels', ['Продукты', 'Дом']);
        fixture.componentRef.setInput('datasets', [
            { label: 'Расходы', data: [75, 25], color: '#23c78b' },
        ]);
        fixture.componentRef.setInput('unit', 'BYN');
        fixture.detectChanges();
        const legend = fixture.debugElement.query(By.directive(ChartBreakdownComponent))
            .componentInstance as ChartBreakdownComponent;
        expect(
            legend
                .items()
                .map((item) => ({ value: legend.value(item), percent: legend.percent(item) })),
        ).toEqual([
            { value: '75 BYN', percent: '75%' },
            { value: '25 BYN', percent: '25%' },
        ]);
        fixture.componentRef.setInput('datasets', [
            { label: 'Расходы', data: [0, 10], color: '#23c78b' },
        ]);
        fixture.detectChanges();
        expect(legend.percent(legend.items()[0])).toBe('100%');
    });

    it('groups only the ring while retaining all items for the list and bar view', () => {
        fixture.componentRef.setInput(
            'labels',
            Array.from({ length: 30 }, (_, i) => `Category ${i}`),
        );
        fixture.componentRef.setInput('datasets', [
            {
                label: 'Expenses',
                data: Array.from({ length: 30 }, (_, i) => 30 - i),
                color: '#123456',
            },
        ]);
        fixture.componentRef.setInput('type', 'doughnut');
        expect(fixture.componentInstance.chartData().labels).toHaveLength(6);
        expect(fixture.componentInstance.breakdown().items).toHaveLength(30);
        fixture.componentRef.setInput('type', 'bar');
        expect(fixture.componentInstance.chartData().labels).toHaveLength(30);
    });
});
