import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MsSelectOption } from '../../../../../shared/ui/select/select';
import { AccountListPanelComponent } from '../../components/account-list-panel/account-list-panel.component';
import { AccountTransferPanelComponent } from '../../components/account-transfer-panel/account-transfer-panel.component';
import { AccountBalanceItem, TransferDraft } from '../../home-page.models';

@Component({
    selector: 'ms-accounts-tab',
    standalone: true,
    imports: [AccountListPanelComponent, AccountTransferPanelComponent],
    templateUrl: './accounts-tab.component.html',
    styleUrl: './accounts-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsTabComponent {
    accounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    allAccounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    transferDraft = input.required<TransferDraft>();
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    accountFilterOptions = input.required<ReadonlyArray<MsSelectOption>>();
    searchControl = input.required<FormControl<string>>();
    selectedAccountId = input.required<string>();
    summaryBalanceLabel = input.required<string>();
    summaryBalanceValue = input.required<number>();
    newAccountName = input.required<string>();
    newAccountCurrency = input.required<string>();
    newAccountNameError = input<string>('');
    transferRateError = input<string>('');
    rateLoading = input(false);
    saving = input(false);

    transferDraftChange = output<TransferDraft>();
    newAccountNameChange = output<string>();
    newAccountCurrencyChange = output<string>();
    createAccount = output<void>();
    deleteAccount = output<string>();
    submitTransfer = output<void>();
    accountChange = output<string>();
}
