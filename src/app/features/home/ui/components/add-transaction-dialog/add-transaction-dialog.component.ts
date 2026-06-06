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
import { TransactionDraft } from '../../home-page.models';

@Component({
    selector: 'ms-add-transaction-dialog',
    standalone: true,
    imports: [FormsModule, Button, InputComponent, SelectComponent],
    templateUrl: './add-transaction-dialog.component.html',
    styleUrl: './add-transaction-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTransactionDialogComponent {
    open = input<boolean>(false);
    saving = input<boolean>(false);
    draft = input.required<TransactionDraft>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    incomeCategoryOptions = input.required<ReadonlyArray<MsSelectOption>>();
    expenseCategoryOptions = input.required<ReadonlyArray<MsSelectOption>>();

    close = output<void>();
    draftChange = output<TransactionDraft>();
    save = output<void>();

    readonly amountText = signal('0.00');
    private readonly amountEditing = signal(false);

    readonly hasAccounts = computed(() => this.accountOptions().length > 0);
    readonly categoryOptions = computed(() =>
        this.draft().type === 'income'
            ? this.incomeCategoryOptions()
            : this.expenseCategoryOptions(),
    );
    readonly canSave = computed(
        () =>
            this.hasAccounts() &&
            !this.saving() &&
            !!this.draft().accountId &&
            !!this.draft().categoryId &&
            this.draft().amount > 0,
    );

    constructor() {
        effect(() => {
            const amount = this.draft().amount;

            if (!this.amountEditing()) {
                this.amountText.set(this.formatMoneyAmount(amount));
            }
        });
    }

    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.close.emit();
        }
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

    onAmountFocus(): void {
        this.amountEditing.set(true);

        if (this.draft().amount <= 0 && this.amountText() === '0.00') {
            this.amountText.set('');
        }
    }

    onAmountInput(value: string | number): void {
        const nextText = this.normalizeAmountInputText(`${value ?? ''}`);

        this.amountText.set(nextText);
        this.draftChange.emit({
            ...this.draft(),
            amount: this.parseMoneyAmount(nextText),
        });
    }

    onAmountBlur(): void {
        this.amountEditing.set(false);
        this.amountText.set(this.formatMoneyAmount(this.parseMoneyAmount(this.amountText())));
    }

    private normalizeAmountInputText(value: string): string {
        if (this.amountEditing() && this.draft().amount <= 0 && value.startsWith('0.00')) {
            return value.slice('0.00'.length);
        }

        return value;
    }
}
