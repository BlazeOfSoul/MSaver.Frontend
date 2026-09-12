import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { DialogShellComponent } from '../../../../../shared/ui/dialog-shell/dialog-shell';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import {
    formatMoneyInputAmount,
    normalizeMoneyInputText,
    parseMoneyInputAmount,
} from '../../../../../shared/utils/money-input.utils';
import { AccountBalanceItem } from '../../home-page.models';
import { AccountOrderPanelComponent } from '../account-order-panel/account-order-panel.component';
import { NameColorDialogComponent } from '../name-color-dialog/name-color-dialog.component';

@Component({
    selector: 'ms-account-list-panel',
    standalone: true,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        Button,
        DialogShellComponent,
        InputComponent,
        SelectComponent,
        NameColorDialogComponent,
        AccountOrderPanelComponent,
    ],
    templateUrl: './account-list-panel.component.html',
    styleUrls: [
        './account-list-panel.component.css',
        './account-list-panel.part-2.css',
        './account-list-panel.part-3.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountListPanelComponent {
    accountOrderItems = input<ReadonlyArray<AccountBalanceItem>>([]);
    reorderAccounts = output<ReadonlyArray<string>>();
    accounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    allAccounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
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
    saving = input(false);

    newAccountNameChange = output<string>();
    newAccountCurrencyChange = output<string>();
    newAccountInitialBalanceChange = output<number>();
    createAccount = output<void>();
    deleteAccount = output<string>();
    renameAccount = output<{ accountId: string; name: string; color: string }>();
    accountChange = output<string>();

    readonly isOrderDialogOpen = signal(false);
    readonly isAccountDialogOpen = signal(false);
    readonly accountDialogName = signal('');
    readonly initialBalanceText = signal('0.00');
    readonly isRenameDialogOpen = signal(false);
    readonly renameAccountId = signal('');
    readonly renameAccountName = signal('');
    readonly renameAccountColor = signal('#23c78b');
    readonly accountPendingDeletion = signal<AccountBalanceItem | null>(null);

    constructor() {
        effect(() => {
            if (this.createdAccountId()) {
                this.closeAccountDialog();
            }
        });
    }

    openDeleteDialog(account: AccountBalanceItem): void {
        if (!account.isPrimary && !this.saving()) {
            this.accountPendingDeletion.set(account);
        }
    }

    closeDeleteDialog(): void {
        this.accountPendingDeletion.set(null);
    }

    confirmDeleteAccount(): void {
        const pendingAccount = this.accountPendingDeletion();
        if (!pendingAccount || this.saving()) {
            return;
        }

        const account = this.allAccounts().find((item) => item.id === pendingAccount.id);
        this.closeDeleteDialog();
        if (account && !account.isPrimary) {
            this.deleteAccount.emit(account.id);
        }
    }

    openAccountDialog(): void {
        this.accountDialogName.set(this.newAccountName());
        this.initialBalanceText.set(formatMoneyInputAmount(this.newAccountInitialBalance()));
        this.isAccountDialogOpen.set(true);
    }

    closeAccountDialog(): void {
        this.isAccountDialogOpen.set(false);
    }

    onInitialBalanceInput(value: string | number): void {
        const nextText = normalizeMoneyInputText(
            `${value ?? ''}`,
            true,
            this.newAccountInitialBalance(),
        );

        this.initialBalanceText.set(nextText);
        this.newAccountInitialBalanceChange.emit(parseMoneyInputAmount(nextText));
    }

    setAccountDialogName(value: string): void {
        this.accountDialogName.set(value);
        this.newAccountNameChange.emit(value);
    }

    submitAccountDialog(): void {
        if (!this.accountDialogName().trim() || this.saving()) {
            return;
        }

        this.createAccount.emit();
    }

    openRenameDialog(account: AccountBalanceItem): void {
        this.renameAccountId.set(account.id);
        this.renameAccountName.set(account.name);
        this.renameAccountColor.set(account.color);
        this.isRenameDialogOpen.set(true);
    }

    closeRenameDialog(): void {
        this.isRenameDialogOpen.set(false);
    }

    setRenameAccountName(value: string): void {
        this.renameAccountName.set(value);
    }

    submitRenameDialog(): void {
        const name = this.renameAccountName().trim();
        const accountId = this.renameAccountId();

        if (!accountId || !name || this.saving()) {
            return;
        }

        this.renameAccount.emit({
            accountId,
            name,
            color: this.renameAccountColor(),
        });
        this.closeRenameDialog();
    }
}
