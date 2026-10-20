import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { AccountListPanelComponent } from '../../components/account-list-panel/account-list-panel.component';
import { AccountTransferPanelComponent } from '../../components/account-transfer-panel/account-transfer-panel.component';
import { AccountBalanceItem, TransferDraft } from '../../home-page.models';
import { ChartCardComponent } from '../../components/chart-card/chart-card.component';
import { AccountMonthActivity } from '../../home-account-activity';
import { formatMoney } from '../../home-formatters';

@Component({
    selector: 'ms-accounts-tab',
    standalone: true,
    imports: [
        AccountListPanelComponent,
        AccountTransferPanelComponent,
        ChartCardComponent,
        SelectComponent,
    ],
    templateUrl: './accounts-tab.component.html',
    styleUrls: [
        './accounts-tab.component.css',
        './accounts-tab.activity.css',
        './accounts-tab.overview.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsTabComponent {
    monthLabel = input('');
    monthActivity = input<ReadonlyMap<string, AccountMonthActivity> | null>(null);
    readonly money = formatMoney;
    readonly selectedCurrency = signal('');
    accountOrderItems = input<ReadonlyArray<AccountBalanceItem>>([]);
    reorderAccounts = output<ReadonlyArray<string>>();
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
                balance: sorted.reduce((total, account) => total + account.balanceValue, 0),
                change: sorted.reduce((total, account) => total + account.monthChangeValue, 0),
                labels: sorted.map((account) => account.name),
                accounts: sorted.map((account) => ({
                    ...account,
                    activity: this.monthActivity()?.get(account.id),
                })),
                height: Math.max(140, sorted.length * 56),
                datasets: [
                    {
                        label: 'Остаток',
                        data: sorted.map((account) => account.balanceValue),
                        color: '#23c78b',
                        colors: sorted.map((account) => account.color),
                    },
                ],
            };
        });
    });
    readonly selectedBalanceChart = computed(() => {
        const charts = this.balanceCharts();
        return charts.find((chart) => chart.currency === this.selectedCurrency()) ?? charts[0];
    });
    readonly balanceCurrencyOptions = computed<ReadonlyArray<MsSelectOption>>(() =>
        this.balanceCharts().map((chart) => ({
            value: chart.currency,
            label: chart.currency,
            description: chart.accounts[0].currencyLabel,
        })),
    );
}
