import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { AccountBalanceItem, TransferDraft } from '../../home-page.models';

@Component({
    selector: 'ms-accounts-tab',
    standalone: true,
    imports: [FormsModule, Button, InputComponent, SelectComponent],
    templateUrl: './accounts-tab.component.html',
    styleUrl: './accounts-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsTabComponent {
    accounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    transferDraft = input.required<TransferDraft>();
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    newAccountName = input.required<string>();
    newAccountCurrency = input.required<string>();

    transferDraftChange = output<TransferDraft>();
    newAccountNameChange = output<string>();
    newAccountCurrencyChange = output<string>();
    createAccount = output<void>();
    submitTransfer = output<void>();
}
