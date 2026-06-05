import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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
}
