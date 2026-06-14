import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';

@Component({
    selector: 'ms-first-account-setup',
    standalone: true,
    imports: [Button, SelectComponent],
    templateUrl: './first-account-setup.component.html',
    styleUrl: './first-account-setup.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstAccountSetupComponent {
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedCurrency = input.required<string>();
    saving = input<boolean>(false);

    currencyChange = output<string>();
    createAccount = output<void>();
}
