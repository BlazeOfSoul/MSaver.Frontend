import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AccountBalanceItem } from '../../home-page.models';
import { resolveCurrencyLabel } from '../../home-formatters';

@Component({
    selector: 'ms-settings-tab',
    standalone: true,
    templateUrl: './settings-tab.component.html',
    styleUrl: './settings-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent {
    applicationCurrencyCode = input.required<string>();
    accounts = input.required<ReadonlyArray<AccountBalanceItem>>();

    readonly primaryAccount = computed(() =>
        this.accounts().find((account) => account.isPrimary) ?? this.accounts()[0],
    );
    readonly applicationCurrencyLabel = computed(() =>
        resolveCurrencyLabel(this.applicationCurrencyCode()),
    );
}
