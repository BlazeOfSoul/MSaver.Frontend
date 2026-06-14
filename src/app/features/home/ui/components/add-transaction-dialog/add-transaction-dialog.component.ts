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
    imports: [FormsModule, Button, DialogShellComponent, InputComponent, SelectComponent],
    templateUrl: './add-transaction-dialog.component.html',
    styleUrls: [
        './add-transaction-dialog.component.css',
        './add-transaction-dialog.part-2.css',
        './add-transaction-dialog.part-3.css',
        './add-transaction-dialog.part-4.css',
    ],
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
    readonly dateText = signal('');
    readonly timeText = signal('');
    readonly datePickerOpen = signal(false);
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

        return [...options].sort((first, second) =>
            first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }),
        );
    });
    readonly dateParts = computed(() => {
        const parts = this.parseDraftDateTime(this.draft().date);

        return {
            ...parts,
            dateInput: this.formatDateLabel(parts.date),
            dateLabel: this.formatDateLabel(parts.date),
        };
    });
    readonly dateTimeInputValue = computed(
        () => `${this.dateParts().dateLabel} ${this.dateParts().time}`,
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

        effect(() => {
            const parts = this.dateParts();

            this.dateText.set(parts.dateInput);
            this.timeText.set(parts.time);
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

    toggleDatePicker(): void {
        this.datePickerOpen.update((isOpen) => !isOpen);
    }

    onDatePartInput(value: string | number): void {
        const nextText = this.maskDateInputText(`${value ?? ''}`);
        const nextDate = this.parseDateInputText(nextText);

        this.dateText.set(nextText);

        if (!nextDate) {
            return;
        }

        this.emitDateTime(nextDate, this.resolveCurrentTimePart());
    }

    onDatePartInputEvent(event: Event): void {
        this.onDatePartInput(this.inputEventValue(event));
    }

    onTimePartInput(value: string | number): void {
        const nextText = this.maskTimeInputText(`${value ?? ''}`);
        const nextTime = this.normalizeTimePart(nextText);

        this.timeText.set(nextText);

        if (!nextTime) {
            return;
        }

        this.emitDateTime(this.resolveCurrentDatePart(), nextTime);
    }

    onTimePartInputEvent(event: Event): void {
        this.onTimePartInput(this.inputEventValue(event));
    }

    setDateOffset(days: number): void {
        const date = new Date();
        date.setDate(date.getDate() + days);
        const nextDate = this.toDatePart(date);

        this.dateText.set(this.formatDateLabel(nextDate));
        this.emitDateTime(nextDate, this.resolveCurrentTimePart());
    }

    setTimeToNow(): void {
        const nextTime = this.toTimePart(new Date());

        this.timeText.set(nextTime);
        this.emitDateTime(this.resolveCurrentDatePart(), nextTime);
    }

    private normalizeAmountInputText(value: string): string {
        return normalizeMoneyInputText(value, this.amountEditing(), this.draft().amount);
    }

    private inputEventValue(event: Event): string {
        return event.target instanceof HTMLInputElement ? event.target.value : '';
    }

    private emitDateTime(date: string, time: string): void {
        this.draftChange.emit({
            ...this.draft(),
            date: `${date}T${time}`,
        });
    }

    private parseDraftDateTime(value: string): { date: string; time: string } {
        const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(value);

        return {
            date: this.normalizeIsoDatePart(match?.[1] ?? '') ?? this.toDatePart(new Date()),
            time: this.normalizeTimePart(match?.[2] ?? '') ?? '00:00',
        };
    }

    private normalizeIsoDatePart(value: string): string | null {
        const trimmed = value.trim();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return null;
        }

        const [year, month, day] = trimmed.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return trimmed;
    }

    private parseDateInputText(value: string): string | null {
        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
            return null;
        }

        const [day, month, year] = value.split('.').map(Number);
        const isoDate = `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
        const normalized = this.normalizeIsoDatePart(isoDate);

        return normalized;
    }

    private normalizeTimePart(value: string): string | null {
        const trimmed = value.trim();

        return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : null;
    }

    private formatDateLabel(value: string): string {
        const [year, month, day] = value.split('-');

        return `${day}.${month}.${year}`;
    }

    private maskDateInputText(value: string): string {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);

        return parts.join('.');
    }

    private maskTimeInputText(value: string): string {
        const digits = value.replace(/\D/g, '').slice(0, 4);
        const hours = digits.slice(0, 2);
        const minutes = digits.slice(2, 4);

        return minutes ? `${hours}:${minutes}` : hours;
    }

    private resolveCurrentDatePart(): string {
        return this.parseDateInputText(this.dateText()) ?? this.dateParts().date;
    }

    private resolveCurrentTimePart(): string {
        return this.normalizeTimePart(this.timeText()) ?? this.dateParts().time;
    }

    private toDatePart(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    private toTimePart(date: Date): string {
        const hours = `${date.getHours()}`.padStart(2, '0');
        const minutes = `${date.getMinutes()}`.padStart(2, '0');

        return `${hours}:${minutes}`;
    }
}
