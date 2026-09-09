import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MsSelectOption } from '../../../../../shared/ui/select/select';
import { AccountListPanelComponent } from '../../components/account-list-panel/account-list-panel.component';
import { AccountTransferPanelComponent } from '../../components/account-transfer-panel/account-transfer-panel.component';
import { AccountBalanceItem, TransferDraft } from '../../home-page.models';
import { ChartCardComponent } from '../../components/chart-card/chart-card.component';

@Component({
    selector: 'ms-accounts-tab',
    standalone: true,
    imports: [AccountListPanelComponent, AccountTransferPanelComponent, ChartCardComponent],
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
    newAccountInitialBalance = input.required<number>();
    newAccountNameError = input<string>('');
    createdAccountId = input<string | null>(null);
    transferRateError = input<string>('');
    rateLoading = input(false);
    saving = input(false);

    transferDraftChange = output<TransferDraft>();
    newAccountNameChange = output<string>();
    newAccountCurrencyChange = output<string>();
    newAccountInitialBalanceChange = output<number>();
    createAccount = output<void>();
    deleteAccount = output<string>();
    renameAccount = output<{ accountId: string; name: string; color: string }>();
    submitTransfer = output<void>();
    accountChange = output<string>();
    readonly balanceCharts = computed(() => {
        const groups = new Map<string, AccountBalanceItem[]>();
        for (const account of this.accounts()) {
            const items = groups.get(account.currencyCode) ?? [];
            items.push(account);
            groups.set(account.currencyCode, items);
        }
        return [...groups].map(([currency, accounts]) => {
            const sorted = accounts.slice().sort((a, b) => b.balanceValue - a.balanceValue);
            return {
                currency,
                labels: sorted.map((account) => account.name),
                height: Math.max(180, sorted.length * 52),
                datasets: [
                    {
                        label: 'Баланс',
                        data: sorted.map((account) => account.balanceValue),
                        color: '#23c78b',
                    },
                    {
                        label: 'Изменение за месяц',
                        data: sorted.map((account) => account.monthChangeValue),
                        color: '#5896ed',
                    },
                ],
            };
        });
    });
}
