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
        fixture.componentRef.setInput('balanceDisplayAccountId', 'all');
        fixture.componentRef.setInput('balanceDisplayOptions', [
            { value: 'all', label: 'Все счета', description: 'Сумма в валюте приложения' },
            { value: 'main-account', label: 'Основной счёт', description: 'BYN' },
        ]);
        fixture.componentRef.setInput('currencyOptions', [
            { value: 'BYN', label: 'BYN - Белорусский рубль' },
            { value: 'USD', label: 'USD - Доллар США' },
        ]);
    });

    it('shows currency, balance display and category order controls without a primary account preview', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const text = fixture.nativeElement.textContent ?? '';

        expect(text).toContain('USD');
        expect(text).toContain('Доллар США');
        expect(text).toContain('Валюта отображения');
        expect(text).toContain('Баланс на главной');
        expect(text).toContain('Показывать баланс');
        expect(text).toContain('Все счета');
        expect(text).toContain('Порядок категорий');
        expect(text).toContain('По приоритету');
        expect(host.querySelector('.currency-preview')).toBeNull();
    });

    it('separates currency, balance display and category order settings into different blocks', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const panels = Array.from(host.querySelectorAll<HTMLElement>('.settings-panel'));

        expect(panels).toHaveLength(3);
        expect(panels[0].textContent).toContain('Валюта приложения');
        expect(panels[0].textContent).not.toContain('Баланс на главной');
        expect(panels[0].textContent).not.toContain('Порядок категорий');
        expect(panels[1].textContent).toContain('Баланс на главной');
        expect(panels[1].textContent).not.toContain('Порядок категорий');
        expect(panels[2].textContent).toContain('Порядок категорий');
    });

    it('emits balance display changes from the settings dropdown', () => {
        const balanceSpy = vi.fn();
        fixture.componentInstance.balanceDisplayAccountChange.subscribe(balanceSpy);
        fixture.detectChanges();

        fixture.componentInstance.updateBalanceDisplayAccount('main-account');

        expect(balanceSpy).toHaveBeenCalledWith('main-account');
    });

    it('emits category ordering changes from the settings dropdown', () => {
        const modeSpy = vi.fn();
        fixture.componentInstance.categorySortModeChange.subscribe(modeSpy);
        fixture.detectChanges();

        fixture.componentInstance.updateCategorySortMode('alphabetical');

        expect(modeSpy).toHaveBeenCalledWith('alphabetical');
    });
});
