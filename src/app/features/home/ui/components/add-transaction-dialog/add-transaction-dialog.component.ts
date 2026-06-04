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
    draft = input.required<TransactionDraft>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    incomeCategoryOptions = input.required<ReadonlyArray<MsSelectOption>>();
    expenseCategoryOptions = input.required<ReadonlyArray<MsSelectOption>>();

    close = output<void>();
    draftChange = output<TransactionDraft>();
    save = output<void>();

    readonly hasAccounts = computed(() => this.accountOptions().length > 0);
    readonly categoryOptions = computed(() =>
        this.draft().type === 'income' ? this.incomeCategoryOptions() : this.expenseCategoryOptions(),
    );
    readonly canSave = computed(
        () =>
            this.hasAccounts() &&
            !!this.draft().accountId &&
            !!this.draft().category &&
            this.draft().amount > 0,
    );
}
