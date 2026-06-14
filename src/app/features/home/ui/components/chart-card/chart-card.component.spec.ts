import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
import { ChartCardComponent } from './chart-card.component';

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
});
