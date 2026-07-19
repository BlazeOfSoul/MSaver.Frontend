import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PwaPushNotificationService } from '../../../../../core/push/pwa-push-notification.service';
import { SettingsTabComponent } from './settings-tab.component';

describe('SettingsTabComponent', () => {
    let fixture: ComponentFixture<SettingsTabComponent>;
    let pushNotifications: {
        getCurrentDeviceStatus: ReturnType<typeof vi.fn>;
        enable: ReturnType<typeof vi.fn>;
        disable: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        pushNotifications = {
            getCurrentDeviceStatus: vi.fn(() => Promise.resolve('disabled')),
            enable: vi.fn(() => Promise.resolve('enabled')),
            disable: vi.fn(() => Promise.resolve()),
        };

        await TestBed.configureTestingModule({
            imports: [SettingsTabComponent],
            providers: [{ provide: PwaPushNotificationService, useValue: pushNotifications }],
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

    it('separates preferences and notifications into different blocks', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const panels = Array.from(host.querySelectorAll<HTMLElement>('.settings-panel'));

        expect(panels).toHaveLength(4);
        expect(panels[0].textContent).toContain('Валюта приложения');
        expect(panels[0].textContent).not.toContain('Баланс на главной');
        expect(panels[0].textContent).not.toContain('Порядок категорий');
        expect(panels[1].textContent).toContain('Баланс на главной');
        expect(panels[1].textContent).not.toContain('Порядок категорий');
        expect(panels[2].textContent).toContain('Порядок категорий');
        expect(panels[3].textContent).toContain('Уведомления');
        expect(panels[3].textContent).toContain('Текущее устройство · этот браузер');
    });

    it('enables notifications for the current browser from settings', async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        await fixture.componentInstance.toggleNotifications();
        fixture.detectChanges();

        expect(pushNotifications.enable).toHaveBeenCalledOnce();
        expect(fixture.componentInstance.notificationsEnabled()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain(
            'Уведомления включены для этого устройства и браузера.',
        );
        expect(fixture.nativeElement.textContent).toContain('Отключить на этом устройстве');
    });

    it('disables only the current browser subscription', async () => {
        pushNotifications.getCurrentDeviceStatus.mockResolvedValue('disabled');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.componentInstance.notificationStatus.set('enabled');

        await fixture.componentInstance.toggleNotifications();
        fixture.detectChanges();

        expect(pushNotifications.disable).toHaveBeenCalledOnce();
        expect(fixture.componentInstance.notificationsEnabled()).toBe(false);
        expect(fixture.nativeElement.textContent).toContain(
            'Уведомления отключены на этом устройстве.',
        );
        expect(fixture.nativeElement.textContent).toContain(
            'Настройки расписаний при этом не изменяются.',
        );
    });

    it('explains when browser permission blocks notifications', async () => {
        pushNotifications.getCurrentDeviceStatus.mockResolvedValue('denied');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.componentInstance.notificationActionDisabled()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('Заблокированы браузером');
        expect(fixture.nativeElement.textContent).toContain(
            'Измените разрешение для сайта в настройках браузера.',
        );
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
