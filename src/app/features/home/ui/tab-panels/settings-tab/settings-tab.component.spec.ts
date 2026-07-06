import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsTabComponent } from './settings-tab.component';

describe('SettingsTabComponent', () => {
    let fixture: ComponentFixture<SettingsTabComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SettingsTabComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsTabComponent);
        fixture.componentRef.setInput('applicationCurrencyCode', 'USD');
        fixture.componentRef.setInput('categorySortMode', 'priority');
        fixture.componentRef.setInput('currencyOptions', [
            { value: 'BYN', label: 'BYN - Белорусский рубль' },
            { value: 'USD', label: 'USD - Доллар США' },
        ]);
    });

    it('shows only the display currency control without the primary account preview', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const text = fixture.nativeElement.textContent ?? '';

        expect(text).toContain('USD');
        expect(text).toContain('Доллар США');
        expect(text).toContain('Валюта отображения');
        expect(text).toContain('Порядок категорий');
        expect(text).toContain('По приоритету');
        expect(host.querySelector('.currency-preview')).toBeNull();
        expect(text).not.toContain('Основной счёт');
        expect(text).not.toContain('Основной');
    });

    it('emits category ordering changes from the settings dropdown', () => {
        const modeSpy = vi.fn();
        fixture.componentInstance.categorySortModeChange.subscribe(modeSpy);
        fixture.detectChanges();

        fixture.componentInstance.updateCategorySortMode('alphabetical');

        expect(modeSpy).toHaveBeenCalledWith('alphabetical');
    });
});
