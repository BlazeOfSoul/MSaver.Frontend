import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    OnInit,
    output,
    signal,
} from '@angular/core';
import {
    CurrentDevicePushStatus,
    PushNotificationStatus,
    PwaPushNotificationService,
} from '../../../../../core/push/pwa-push-notification.service';
import { Button } from '../../../../../shared/ui/button/button';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { CategorySortMode } from '../../home-category-order.utils';

@Component({
    selector: 'ms-settings-tab',
    standalone: true,
    imports: [Button, SelectComponent],
    templateUrl: './settings-tab.component.html',
    styleUrl: './settings-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent implements OnInit {
    private readonly pushNotifications = inject(PwaPushNotificationService);

    applicationCurrencyCode = input.required<string>();
    categorySortMode = input.required<CategorySortMode>();
    balanceDisplayAccountId = input.required<string>();
    balanceDisplayOptions = input.required<ReadonlyArray<MsSelectOption>>();
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    saving = input(false);

    readonly notificationStatus = signal<CurrentDevicePushStatus>('disabled');
    readonly notificationLoading = signal(true);
    readonly notificationMessage = signal('');
    readonly notificationsEnabled = computed(() => this.notificationStatus() === 'enabled');
    readonly notificationActionDisabled = computed(
        () =>
            this.saving() ||
            this.notificationLoading() ||
            this.notificationStatus() === 'denied' ||
            this.notificationStatus() === 'unsupported',
    );

    readonly categorySortOptions: ReadonlyArray<MsSelectOption> = [
        { value: 'priority', label: 'По приоритету' },
        { value: 'alphabetical', label: 'По алфавиту' },
    ];

    applicationCurrencyChange = output<string>();
    balanceDisplayAccountChange = output<string>();
    categorySortModeChange = output<CategorySortMode>();

    ngOnInit(): void {
        void this.refreshNotificationStatus();
    }

    updateApplicationCurrency(value: string): void {
        this.applicationCurrencyChange.emit(value);
    }

    updateBalanceDisplayAccount(value: string): void {
        this.balanceDisplayAccountChange.emit(value);
    }

    updateCategorySortMode(value: string): void {
        this.categorySortModeChange.emit(value === 'alphabetical' ? 'alphabetical' : 'priority');
    }

    async toggleNotifications(): Promise<void> {
        if (this.notificationActionDisabled()) {
            return;
        }

        this.notificationLoading.set(true);
        this.notificationMessage.set('');

        try {
            if (this.notificationsEnabled()) {
                await this.pushNotifications.disable();
                const status = await this.pushNotifications.getCurrentDeviceStatus();
                this.notificationStatus.set(status);
                this.notificationMessage.set(
                    status === 'disabled'
                        ? 'Уведомления отключены на этом устройстве.'
                        : 'Не удалось отключить уведомления. Попробуйте ещё раз.',
                );
                return;
            }

            const status = await this.pushNotifications.enable();
            this.notificationStatus.set(
                status === 'enabled' || status === 'denied' || status === 'unsupported'
                    ? status
                    : 'disabled',
            );
            this.notificationMessage.set(this.notificationStatusMessage(status));
        } catch {
            this.notificationMessage.set('Не удалось изменить настройку уведомлений.');
        } finally {
            this.notificationLoading.set(false);
        }
    }

    notificationStatusLabel(): string {
        switch (this.notificationStatus()) {
            case 'enabled':
                return 'Включены';
            case 'denied':
                return 'Заблокированы браузером';
            case 'unsupported':
                return 'Не поддерживаются';
            default:
                return 'Выключены';
        }
    }

    notificationStatusIcon(): string {
        switch (this.notificationStatus()) {
            case 'enabled':
                return 'notifications_active';
            case 'denied':
                return 'notifications_off';
            case 'unsupported':
                return 'mobile_off';
            default:
                return 'notifications_none';
        }
    }

    private async refreshNotificationStatus(): Promise<void> {
        this.notificationLoading.set(true);

        try {
            this.notificationStatus.set(await this.pushNotifications.getCurrentDeviceStatus());
        } catch {
            this.notificationMessage.set('Не удалось проверить состояние уведомлений.');
        } finally {
            this.notificationLoading.set(false);
        }
    }

    private notificationStatusMessage(status: PushNotificationStatus): string {
        switch (status) {
            case 'enabled':
                return 'Уведомления включены для этого устройства и браузера.';
            case 'denied':
                return 'Уведомления заблокированы. Разрешите их в настройках браузера.';
            case 'unsupported':
                return 'Этот браузер не поддерживает PWA-уведомления.';
            case 'not-configured':
                return 'Уведомления пока не настроены на сервере.';
            default:
                return 'Не удалось включить уведомления. Попробуйте ещё раз.';
        }
    }
}
