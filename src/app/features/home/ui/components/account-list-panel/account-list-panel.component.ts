import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { AccountBalanceItem } from '../../home-page.models';

@Component({
    selector: 'ms-account-list-panel',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, Button, InputComponent, SelectComponent],
    templateUrl: './account-list-panel.component.html',
    styleUrls: [
        './account-list-panel.component.css',
        './account-list-panel.part-2.css',
        './account-list-panel.part-3.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountListPanelComponent {
    accounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    allAccounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    accountFilterOptions = input.required<ReadonlyArray<MsSelectOption>>();
    searchControl = input.required<FormControl<string>>();
    selectedAccountId = input.required<string>();
    summaryBalanceLabel = input.required<string>();
    summaryBalanceValue = input.required<number>();
    newAccountName = input.required<string>();
    newAccountCurrency = input.required<string>();
    newAccountNameError = input<string>('');
    saving = input(false);

    newAccountNameChange = output<string>();
    newAccountCurrencyChange = output<string>();
    createAccount = output<void>();
    deleteAccount = output<string>();
    accountChange = output<string>();
}
