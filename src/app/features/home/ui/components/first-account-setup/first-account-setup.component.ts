import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import {
    formatMoneyInputAmount,
    normalizeMoneyInputText,
    parseMoneyInputAmount,
} from '../../../../../shared/utils/money-input.utils';

@Component({
    selector: 'ms-first-account-setup',
    standalone: true,
    imports: [FormsModule, Button, InputComponent, SelectComponent],
    templateUrl: './first-account-setup.component.html',
    styleUrls: ['./first-account-setup.component.css', './first-account-setup.part-2.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstAccountSetupComponent {
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedCurrency = input.required<string>();
    initialBalance = input.required<number>();
    saving = input<boolean>(false);

    currencyChange = output<string>();
    initialBalanceChange = output<number>();
    createAccount = output<void>();

    readonly initialBalanceText = signal(formatMoneyInputAmount(0));

    onInitialBalanceInput(value: string | number): void {
        const nextText = normalizeMoneyInputText(`${value ?? ''}`, true, this.initialBalance());

        this.initialBalanceText.set(nextText);
        this.initialBalanceChange.emit(parseMoneyInputAmount(nextText));
    }
}
