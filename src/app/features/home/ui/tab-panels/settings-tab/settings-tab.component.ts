import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { CategorySortMode } from '../../home-category-order.utils';

@Component({
    selector: 'ms-settings-tab',
    standalone: true,
    imports: [SelectComponent],
    templateUrl: './settings-tab.component.html',
    styleUrl: './settings-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent {
    applicationCurrencyCode = input.required<string>();
    categorySortMode = input.required<CategorySortMode>();
    balanceDisplayAccountId = input.required<string>();
    balanceDisplayOptions = input.required<ReadonlyArray<MsSelectOption>>();
    currencyOptions = input.required<ReadonlyArray<MsSelectOption>>();
    saving = input(false);

    readonly categorySortOptions: ReadonlyArray<MsSelectOption> = [
        { value: 'priority', label: 'По приоритету' },
        { value: 'alphabetical', label: 'По алфавиту' },
    ];

    applicationCurrencyChange = output<string>();
    balanceDisplayAccountChange = output<string>();
    categorySortModeChange = output<CategorySortMode>();

    updateApplicationCurrency(value: string): void {
        this.applicationCurrencyChange.emit(value);
    }

    updateBalanceDisplayAccount(value: string): void {
        this.balanceDisplayAccountChange.emit(value);
    }

    updateCategorySortMode(value: string): void {
        this.categorySortModeChange.emit(value === 'alphabetical' ? 'alphabetical' : 'priority');
    }
}
