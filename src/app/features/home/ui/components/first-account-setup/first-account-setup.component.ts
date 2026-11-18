import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    OnInit,
    output,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { parseInitialAccountBalance } from '../../home-amount.utils';
import { ACCOUNT_COLORS } from '../../home-page.constants';
import { ColorFieldComponent } from '../color-field/color-field.component';

@Component({
    selector: 'ms-first-account-setup',
    standalone: true,
    imports: [FormsModule, Button, InputComponent, SelectComponent, ColorFieldComponent],
    templateUrl: './first-account-setup.component.html',
    styleUrls: ['./first-account-setup.component.css', './first-account-setup.part-2.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstAccountSetupComponent implements OnInit {
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedCurrency = input.required<string>();
    initialBalance = input.required<number>();
    saving = input<boolean>(false);
    error = input('');

    currencyChange = output<string>();
    initialBalanceChange = output<number>();
    createAccount = output<string>();

    readonly color = signal(ACCOUNT_COLORS[0]);
    readonly initialBalanceText = signal('');
    readonly balanceDraft = computed(() =>
        parseInitialAccountBalance(this.initialBalanceText(), this.selectedCurrency()),
    );

    ngOnInit(): void {
        const balance = this.initialBalance();
        this.initialBalanceText.set(balance ? String(balance) : '');
    }

    onInitialBalanceInput(value: string | number): void {
        this.initialBalanceText.set(String(value));
        const { amount, error } = this.balanceDraft();
        if (!error) this.initialBalanceChange.emit(amount);
    }

    submit(): void {
        const { amount, error } = this.balanceDraft();
        if (this.saving() || error) return;

        this.initialBalanceChange.emit(amount);
        this.createAccount.emit(this.color());
    }
}
