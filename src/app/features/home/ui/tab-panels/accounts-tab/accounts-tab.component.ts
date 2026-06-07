import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    output,
    signal,
} from '@angular/core';
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

    readonly transferAmountText = signal('0.00');
    readonly transferReceiveAmountText = signal('0.00');
    private readonly transferAmountEditing = signal(false);
    private readonly transferReceiveAmountEditing = signal(false);

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
    readonly isBankRateInverted = computed(() => {
        const rate = this.transferDraft().rate;
        return !!rate && rate > 0 && rate < 1;
    });
    readonly bankRatePairLabel = computed(() => {
        const from = this.fromAccount()?.currencyCode ?? '';
        const to = this.toAccount()?.currencyCode ?? '';

        if (!from || !to) {
            return 'Курс';
        }

        return this.isBankRateInverted() ? `${to} → ${from}` : `${from} → ${to}`;
    });
    readonly bankRateHint = computed(() => {
        const from = this.fromAccount()?.currencyCode ?? '';
        const to = this.toAccount()?.currencyCode ?? '';
        const displayRate = this.displayTransferRate();

        if (!from || !to || !displayRate) {
            return 'Оставьте курс как есть или укажите свой для этой операции.';
        }

        const base = this.isBankRateInverted() ? to : from;
        const quote = this.isBankRateInverted() ? from : to;

        return `1 ${base} = ${displayRate} ${quote}`;
    });
    readonly transferReceiveAmountLabel = computed(() => {
        const amount = this.transferDraft().amount;
        const toCurrency = this.toAccount()?.currencyCode ?? '';
        const rate = this.usesDifferentCurrencies() ? this.transferDraft().rate : 1;

        if (!amount || amount <= 0) {
            return this.appendCurrency('0.00', toCurrency);
        }

        if (!rate || rate <= 0) {
            return this.appendCurrency('—', toCurrency);
        }

        return this.appendCurrency(this.formatMoneyAmount(amount * rate), toCurrency);
    });

    constructor() {
        effect(() => {
            const amount = this.transferDraft().amount;

            if (!this.transferAmountEditing()) {
                this.transferAmountText.set(this.formatMoneyAmount(amount));
            }

            if (!this.transferReceiveAmountEditing()) {
                this.transferReceiveAmountText.set(
                    this.formatMoneyAmount(this.calculateReceiveAmount(amount)),
                );
            }
        });
    }

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

    onTransferAmountFocus(): void {
        this.transferAmountEditing.set(true);

        if (this.transferDraft().amount <= 0 && this.transferAmountText() === '0.00') {
            this.transferAmountText.set('');
        }
    }

    onTransferAmountInput(value: string | number): void {
        const nextText = this.normalizeTransferAmountInputText(`${value ?? ''}`);
        const amount = this.parseMoneyAmount(nextText);

        this.transferAmountText.set(nextText);
        if (!this.transferReceiveAmountEditing()) {
            this.transferReceiveAmountText.set(
                this.formatMoneyAmount(this.calculateReceiveAmount(amount)),
            );
        }
        this.transferDraftChange.emit({
            ...this.transferDraft(),
            amount,
        });
    }

    onTransferAmountBlur(): void {
        this.transferAmountEditing.set(false);
        this.transferAmountText.set(this.formatMoneyAmount(this.parseMoneyAmount(this.transferAmountText())));
    }

    onTransferReceiveAmountFocus(): void {
        this.transferReceiveAmountEditing.set(true);

        if (this.calculateReceiveAmount(this.transferDraft().amount) <= 0 && this.transferReceiveAmountText() === '0.00') {
            this.transferReceiveAmountText.set('');
        }
    }

    onTransferReceiveAmountInput(value: string | number): void {
        const nextText = this.normalizeTransferReceiveAmountInputText(`${value ?? ''}`);
        const receiveAmount = this.parseMoneyAmount(nextText);
        const withdrawAmount = this.calculateWithdrawAmount(receiveAmount);

        this.transferReceiveAmountText.set(nextText);
        if (!this.transferAmountEditing()) {
            this.transferAmountText.set(this.formatMoneyAmount(withdrawAmount));
        }
        this.transferDraftChange.emit({
            ...this.transferDraft(),
            amount: withdrawAmount,
        });
    }

    onTransferReceiveAmountBlur(): void {
        this.transferReceiveAmountEditing.set(false);
        this.transferReceiveAmountText.set(this.formatMoneyAmount(this.parseMoneyAmount(this.transferReceiveAmountText())));
    }

    displayTransferRate(): string {
        const rate = this.transferDraft().rate;

        if (!rate || rate <= 0) {
            return '';
        }

        const displayRate = rate < 1 ? 1 / rate : rate;

        return this.formatRate(displayRate);
    }

    onTransferRateInput(value: string | number): void {
        const parsed = this.parseTransferRate(value);
        const nextRate = parsed > 0
            ? this.isBankRateInverted()
                ? Math.round((1 / parsed) * 1_000_000) / 1_000_000
                : parsed
            : null;

        this.transferDraftChange.emit({
            ...this.transferDraft(),
            rate: nextRate,
        });
    }

    private normalizeTransferAmountInputText(value: string): string {
        if (this.transferAmountEditing() && this.transferDraft().amount <= 0 && value.startsWith('0.00')) {
            return value.slice('0.00'.length);
        }

        return value;
    }

    private normalizeTransferReceiveAmountInputText(value: string): string {
        if (this.transferReceiveAmountEditing() && this.calculateReceiveAmount(this.transferDraft().amount) <= 0 && value.startsWith('0.00')) {
            return value.slice('0.00'.length);
        }

        return value;
    }

    private parseTransferRate(value: string | number): number {
        const normalized = `${value ?? ''}`.replace(',', '.').replace(/\s/g, '').trim();
        const parsed = Number.parseFloat(normalized);

        if (!Number.isFinite(parsed) || parsed <= 0) {
            return 0;
        }

        return Math.round(parsed * 1_000) / 1_000;
    }

    private formatRate(value: number): string {
        return Number.isFinite(value)
            ? value.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 3,
            })
            : '';
    }

    private calculateReceiveAmount(withdrawAmount: number): number {
        const rate = this.transferReceiveRate();

        if (!withdrawAmount || withdrawAmount <= 0 || rate <= 0) {
            return 0;
        }

        return Math.round(withdrawAmount * rate * 100) / 100;
    }

    private calculateWithdrawAmount(receiveAmount: number): number {
        const rate = this.transferReceiveRate();

        if (!receiveAmount || receiveAmount <= 0 || rate <= 0) {
            return 0;
        }

        return Math.round((receiveAmount / rate) * 100) / 100;
    }

    private transferReceiveRate(): number {
        if (!this.usesDifferentCurrencies()) {
            return 1;
        }

        return this.transferDraft().rate ?? 0;
    }

    private appendCurrency(value: string, currencyCode: string): string {
        return currencyCode ? `${value} ${currencyCode}` : value;
    }
}
