import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { CategoryBreakdownItem, TagGroupItem } from '../../home-page.models';

@Component({
    selector: 'ms-categories-tab',
    standalone: true,
    imports: [FormsModule, InputComponent, SelectComponent],
    templateUrl: './categories-tab.component.html',
    styleUrl: './categories-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesTabComponent {
    incomeCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    expenseCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    tagGroups = input.required<ReadonlyArray<TagGroupItem>>();
    newIncomeCategory = input.required<string>();
    newExpenseCategory = input.required<string>();
    newTagGroup = input.required<string>();
    categoryOptions = input.required<ReadonlyArray<MsSelectOption>>();
    saving = input(false);

    newIncomeCategoryChange = output<string>();
    newExpenseCategoryChange = output<string>();
    newTagGroupChange = output<string>();
    addIncomeCategory = output<void>();
    addExpenseCategory = output<void>();
    addTagGroup = output<void>();
    deleteCategory = output<string>();
    deleteTag = output<string>();
    assignCategoryToTag = output<{ tagId: string; categoryId: string }>();
    removeCategoryFromTag = output<{ tagId: string; categoryId: string }>();
}
