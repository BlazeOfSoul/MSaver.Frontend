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
import { DateTimePickerComponent } from '../../../../../shared/ui/date-time-picker/date-time-picker';
import { DialogShellComponent } from '../../../../../shared/ui/dialog-shell/dialog-shell';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import {
    formatMoneyInputAmount,
    normalizeMoneyInputText,
    parseMoneyInputAmount,
} from '../../../../../shared/utils/money-input.utils';
import { TransactionDraft } from '../../home-page.models';

@Component({
    selector: 'ms-add-transaction-dialog',
    standalone: true,
    imports: [
        FormsModule,
        Button,
        DateTimePickerComponent,
        DialogShellComponent,
        InputComponent,
        SelectComponent,
    ],
    templateUrl: './add-transaction-dialog.component.html',
    styleUrls: ['./add-transaction-dialog.component.css', './add-transaction-dialog.part-2.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTransactionDialogComponent {
    open = input<boolean>(false);
    saving = input<boolean>(false);
    mode = input<'create' | 'edit'>('create');
    draft = input.required<TransactionDraft>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    incomeCategoryOptions = input.required<ReadonlyArray<MsSelectOption>>();
    expenseCategoryOptions = input.required<ReadonlyArray<MsSelectOption>>();
    currencyCode = input<string>('BYN');

    close = output<void>();
    draftChange = output<TransactionDraft>();
    save = output<void>();

    readonly amountText = signal('0.00');
    readonly dateTimeValid = signal(true);
    private readonly amountEditing = signal(false);

    readonly hasAccounts = computed(() => this.accountOptions().length > 0);
    readonly isEditMode = computed(() => this.mode() === 'edit');
    readonly dialogTitle = computed(() =>
        this.isEditMode() ? 'Редактировать транзакцию' : 'Новая транзакция',
    );
    readonly dialogDescription = computed(() =>
        this.isEditMode()
            ? 'Измените сумму, категорию, дату или описание операции.'
            : 'Добавьте доход или расход в выбранный месяц.',
    );
    readonly saveLabel = computed(() =>
        this.isEditMode() ? 'Сохранить транзакцию' : 'Добавить транзакцию',
    );
    readonly normalizedCurrencyCode = computed(
        () => this.currencyCode().trim().toUpperCase() || 'BYN',
    );
    readonly categoryOptions = computed(() => {
        const options =
            this.draft().type === 'income'
                ? this.incomeCategoryOptions()
                : this.expenseCategoryOptions();

        return options;
    });
    readonly canSave = computed(
        () =>
            this.hasAccounts() &&
            !this.saving() &&
            !!this.draft().accountId &&
            !!this.draft().categoryId &&
            this.draft().amount > 0 &&
            this.dateTimeValid(),
    );

    constructor() {
        effect(() => {
            const amount = this.draft().amount;

            if (!this.amountEditing()) {
                this.amountText.set(this.formatMoneyAmount(amount));
            }
        });
    }

    formatMoneyAmount(value: number): string {
        return formatMoneyInputAmount(value);
    }

    parseMoneyAmount(value: string | number): number {
        return parseMoneyInputAmount(value);
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

    onDateTimeChange(value: string): void {
        this.dateTimeValid.set(true);
        this.draftChange.emit({
            ...this.draft(),
            date: value,
        });
    }

    onDateTimeValidityChange(valid: boolean): void {
        this.dateTimeValid.set(valid);
    }

    private normalizeAmountInputText(value: string): string {
        return normalizeMoneyInputText(value, this.amountEditing(), this.draft().amount);
    }
}
