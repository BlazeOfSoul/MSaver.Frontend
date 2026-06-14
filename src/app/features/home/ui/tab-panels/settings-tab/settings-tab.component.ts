import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';

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
    saving = input(false);

    applicationCurrencyChange = output<string>();

    updateApplicationCurrency(value: string): void {
        this.applicationCurrencyChange.emit(value);
    }
}
