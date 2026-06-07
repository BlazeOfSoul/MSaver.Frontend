import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { AccountBalanceItem } from '../../home-page.models';
import { resolveCurrencyLabel } from '../../home-formatters';

@Component({
    selector: 'ms-settings-tab',
    standalone: true,
    imports: [SelectComponent],
    templateUrl: './settings-tab.component.html',
    styleUrl: './settings-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent {
    applicationCurrencyCode = input.required<string>();
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    accounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    saving = input(false);

    applicationCurrencyChange = output<string>();

    readonly primaryAccount = computed(() =>
        this.accounts().find((account) => account.isPrimary) ?? this.accounts()[0],
    );
    readonly applicationCurrencyLabel = computed(() =>
        resolveCurrencyLabel(this.applicationCurrencyCode()),
    );

    updateApplicationCurrency(value: string): void {
        this.applicationCurrencyChange.emit(value);
    }
}
