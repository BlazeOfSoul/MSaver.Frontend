import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { TransactionItem } from '../../home-page.models';

@Component({
    selector: 'ms-overview-tab',
    standalone: true,
    imports: [ReactiveFormsModule, InputComponent, SelectComponent],
    templateUrl: './overview-tab.component.html',
    styleUrl: './overview-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewTabComponent {
    transactions = input.required<ReadonlyArray<TransactionItem>>();
    searchControl = input.required<FormControl<string>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedAccountId = input.required<string>();
    saving = input(false);

    deleteTransaction = output<string>();
    accountChange = output<string>();
}
