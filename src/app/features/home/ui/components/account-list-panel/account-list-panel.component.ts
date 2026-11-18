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
import { DialogShellComponent } from '../../../../../shared/ui/dialog-shell/dialog-shell';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { nextAccountColor } from '../../home-account-colors';
import { parseInitialAccountBalance } from '../../home-amount.utils';
import { AccountBalanceItem } from '../../home-page.models';
import { AccountOrderPanelComponent } from '../account-order-panel/account-order-panel.component';
import { NameColorDialogComponent } from '../name-color-dialog/name-color-dialog.component';
import { ColorFieldComponent } from '../color-field/color-field.component';

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
        ColorFieldComponent,
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
    accountEditRevision = input(0);
    accountEditError = input('');
    saving = input(false);

    newAccountNameChange = output<string>();
    newAccountCurrencyChange = output<string>();
    newAccountInitialBalanceChange = output<number>();
    createAccount = output<string>();
    deleteAccount = output<string>();
    renameAccount = output<{ accountId: string; name: string; color: string }>();
    accountChange = output<string>();

    readonly isOrderDialogOpen = signal(false);
    readonly isAccountDialogOpen = signal(false);
    readonly accountDialogName = signal('');
    readonly accountDialogColor = signal('');
    readonly initialBalanceText = signal('');
    readonly initialBalanceDraft = computed(() =>
        parseInitialAccountBalance(this.initialBalanceText(), this.newAccountCurrency()),
    );
    readonly isRenameDialogOpen = signal(false);
    readonly renameAccountId = signal('');
    readonly renameAccountName = signal('');
    readonly renameAccountColor = signal('#23c78b');
    readonly renameAttempted = signal(false);
    readonly accountPendingDeletion = signal<AccountBalanceItem | null>(null);

    constructor() {
        effect(() => {
            if (this.createdAccountId()) {
                this.isAccountDialogOpen.set(false);
            }
        });
        effect(() => {
            if (this.accountEditRevision()) {
                this.isRenameDialogOpen.set(false);
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
        this.accountDialogColor.set(
            nextAccountColor(this.allAccounts().map((account) => account.color)),
        );
        const balance = this.newAccountInitialBalance();
        this.initialBalanceText.set(balance ? String(balance) : '');
        this.isAccountDialogOpen.set(true);
    }

    closeAccountDialog(): void {
        if (!this.saving()) this.isAccountDialogOpen.set(false);
    }

    onInitialBalanceInput(value: string | number): void {
        this.initialBalanceText.set(String(value));
        const { amount, error } = this.initialBalanceDraft();
        if (!error) this.newAccountInitialBalanceChange.emit(amount);
    }

    setAccountDialogName(value: string): void {
        this.accountDialogName.set(value);
        this.newAccountNameChange.emit(value);
    }

    submitAccountDialog(): void {
        const { amount, error } = this.initialBalanceDraft();
        if (!this.accountDialogName().trim() || this.saving() || error) {
            return;
        }

        this.newAccountInitialBalanceChange.emit(amount);
        this.createAccount.emit(this.accountDialogColor());
    }

    openRenameDialog(account: AccountBalanceItem): void {
        this.renameAccountId.set(account.id);
        this.renameAccountName.set(account.name);
        this.renameAccountColor.set(account.color);
        this.renameAttempted.set(false);
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

        this.renameAttempted.set(true);
        this.renameAccount.emit({
            accountId,
            name,
            color: this.renameAccountColor(),
        });
    }
}
