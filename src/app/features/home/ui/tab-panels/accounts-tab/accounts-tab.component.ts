import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { AccountBalanceItem, TransferDraft } from '../../home-page.models';

@Component({
    selector: 'ms-accounts-tab',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, Button, InputComponent, SelectComponent],
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
    newAccountName = input.required<string>();
    newAccountCurrency = input.required<string>();
    saving = input(false);

    transferDraftChange = output<TransferDraft>();
    newAccountNameChange = output<string>();
    newAccountCurrencyChange = output<string>();
    createAccount = output<void>();
    deleteAccount = output<string>();
    submitTransfer = output<void>();
    accountChange = output<string>();

    readonly fromAccount = computed(() =>
        this.allAccounts().find((account) => account.id === this.transferDraft().fromAccountId),
    );
    readonly toAccount = computed(() =>
        this.allAccounts().find((account) => account.id === this.transferDraft().toAccountId),
    );
    readonly usesDifferentCurrencies = computed(
        () =>
            !!this.fromAccount() &&
            !!this.toAccount() &&
            this.fromAccount()?.currencyCode !== this.toAccount()?.currencyCode,
    );
    readonly canSubmitTransfer = computed(
        () =>
            this.accountOptions().length > 1 &&
            !!this.transferDraft().amount &&
            this.transferDraft().fromAccountId !== this.transferDraft().toAccountId &&
            !this.saving(),
    );

    formatMoneyAmount(value: number): string {
        return Number.isFinite(value) && value > 0 ? value.toFixed(2) : '0.00';
    }

    parseMoneyAmount(value: string | number): number {
        const normalized = `${value ?? ''}`.replace(',', '.').replace(/\s/g, '').trim();
        const parsed = Number.parseFloat(normalized);

        if (!Number.isFinite(parsed) || parsed <= 0) {
            return 0;
        }

        return Math.round(parsed * 100) / 100;
    }
}
