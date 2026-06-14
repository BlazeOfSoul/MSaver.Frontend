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
        expect(host.querySelector('.currency-preview')).toBeNull();
        expect(text).not.toContain('Основной счёт');
        expect(text).not.toContain('Основной');
    });
});
