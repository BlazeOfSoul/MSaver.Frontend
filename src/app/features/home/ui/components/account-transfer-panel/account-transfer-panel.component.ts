import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    output,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { AccountBalanceItem, TransferDraft } from '../../home-page.models';
import {
    appendTransferCurrency,
    calculateTransferReceiveAmount,
    calculateTransferWithdrawAmount,
    canSubmitAccountTransfer,
    displayTransferRate,
    formatTransferMoneyAmount,
    normalizeTransferMoneyInputText,
    parseTransferMoneyAmount,
    toTransferDraftRate,
    transferReceiveRate,
} from './account-transfer-panel.helpers';

@Component({
    selector: 'ms-account-transfer-panel',
    standalone: true,
    imports: [FormsModule, Button, InputComponent, SelectComponent],
    templateUrl: './account-transfer-panel.component.html',
    styleUrls: ['./account-transfer-panel.component.css', './account-transfer-panel.part-2.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTransferPanelComponent {
    allAccounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    transferDraft = input.required<TransferDraft>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    transferRateError = input<string>('');
    rateLoading = input(false);
    saving = input(false);

    transferDraftChange = output<TransferDraft>();
    submitTransfer = output<void>();

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
    readonly canSubmitTransfer = computed(() => {
        const draft = this.transferDraft();

        return canSubmitAccountTransfer({
            accountOptionCount: this.accountOptions().length,
            draft,
            usesDifferentCurrencies: this.usesDifferentCurrencies(),
            rateLoading: this.rateLoading(),
            saving: this.saving(),
        });
    });
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
        return formatTransferMoneyAmount(value);
    }

    parseMoneyAmount(value: string | number): number {
        return parseTransferMoneyAmount(value);
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
        this.transferAmountText.set(
            this.formatMoneyAmount(this.parseMoneyAmount(this.transferAmountText())),
        );
    }

    onTransferReceiveAmountFocus(): void {
        this.transferReceiveAmountEditing.set(true);

        if (
            this.calculateReceiveAmount(this.transferDraft().amount) <= 0 &&
            this.transferReceiveAmountText() === '0.00'
        ) {
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
        this.transferReceiveAmountText.set(
            this.formatMoneyAmount(this.parseMoneyAmount(this.transferReceiveAmountText())),
        );
    }

    displayTransferRate(): string {
        return displayTransferRate(this.transferDraft().rate);
    }

    onTransferRateInput(value: string | number): void {
        this.transferDraftChange.emit({
            ...this.transferDraft(),
            rate: toTransferDraftRate(value, this.isBankRateInverted()),
        });
    }

    private normalizeTransferAmountInputText(value: string): string {
        return normalizeTransferMoneyInputText(
            value,
            this.transferAmountEditing(),
            this.transferDraft().amount,
        );
    }

    private normalizeTransferReceiveAmountInputText(value: string): string {
        return normalizeTransferMoneyInputText(
            value,
            this.transferReceiveAmountEditing(),
            this.calculateReceiveAmount(this.transferDraft().amount),
        );
    }

    private calculateReceiveAmount(withdrawAmount: number): number {
        return calculateTransferReceiveAmount(withdrawAmount, this.transferReceiveRate());
    }

    private calculateWithdrawAmount(receiveAmount: number): number {
        return calculateTransferWithdrawAmount(receiveAmount, this.transferReceiveRate());
    }

    private transferReceiveRate(): number {
        return transferReceiveRate(this.usesDifferentCurrencies(), this.transferDraft().rate);
    }

    private appendCurrency(value: string, currencyCode: string): string {
        return appendTransferCurrency(value, currencyCode);
    }
}
