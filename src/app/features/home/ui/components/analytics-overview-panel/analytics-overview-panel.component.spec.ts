import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsMetricCard } from '../../home-page.models';
import {
    AnalyticsOverviewPanelComponent,
    AnalyticsViewOption,
} from './analytics-overview-panel.component';

describe('AnalyticsOverviewPanelComponent', () => {
    let fixture: ComponentFixture<AnalyticsOverviewPanelComponent>;

    const views: ReadonlyArray<AnalyticsViewOption> = [
        { id: 'monthly', label: 'Месяц' },
        { id: 'yearly', label: 'Год' },
    ];

    const metrics: ReadonlyArray<AnalyticsMetricCard> = [
        {
            id: 'income',
            label: 'Доходы',
            value: '1 000 Br',
            caption: 'За месяц',
        },
        {
            id: 'expense',
            label: 'Расходы',
            value: '400 Br',
            caption: 'За месяц',
        },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AnalyticsOverviewPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AnalyticsOverviewPanelComponent);
        fixture.componentRef.setInput('metrics', metrics);
        fixture.componentRef.setInput('accountOptions', [
            { value: 'all', label: 'Все счета' },
            { value: 'main', label: 'Основной' },
        ]);
        fixture.componentRef.setInput('selectedAccountId', 'all');
        fixture.componentRef.setInput('views', views);
        fixture.componentRef.setInput('activeView', 'monthly');
    });

    it('renders analytics metrics and marks the active view tab', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const cards = Array.from(host.querySelectorAll('.metric-card'));
        const tabs = Array.from(host.querySelectorAll('ms-button'));

        expect(cards).toHaveLength(2);
        expect(cards[0].textContent ?? '').toContain('Доходы');
        expect(cards[0].textContent ?? '').toContain('1 000 Br');
        expect(cards[1].textContent ?? '').toContain('Расходы');
        expect(tabs[0].classList.contains('ms-btn-active')).toBe(true);
        expect(tabs[1].classList.contains('ms-btn-active')).toBe(false);
    });

    it('emits view and account changes from panel controls', () => {
        const viewSpy = vi.fn();
        const accountSpy = vi.fn();
        fixture.componentInstance.viewChange.subscribe(viewSpy);
        fixture.componentInstance.accountChange.subscribe(accountSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelectorAll<HTMLElement>('ms-button')[1]?.click();
        fixture.componentInstance.accountChange.emit('main');

        expect(viewSpy).toHaveBeenCalledWith('yearly');
        expect(accountSpy).toHaveBeenCalledWith('main');
    });
});
