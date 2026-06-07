import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { CategoryBreakdownItem, TagGroupItem } from '../../home-page.models';

type CategoryDialogType = 'income' | 'expense';

@Component({
    selector: 'ms-categories-tab',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, InputComponent, SelectComponent],
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
    newIncomeCategoryColor = input.required<string>();
    newExpenseCategoryColor = input.required<string>();
    categoryOptions = input.required<ReadonlyArray<MsSelectOption>>();
    searchControl = input.required<FormControl<string>>();
    saving = input(false);

    newIncomeCategoryChange = output<string>();
    newExpenseCategoryChange = output<string>();
    newTagGroupChange = output<string>();
    newIncomeCategoryColorChange = output<string>();
    newExpenseCategoryColorChange = output<string>();
    addIncomeCategory = output<void>();
    addExpenseCategory = output<void>();
    addTagGroup = output<void>();
    deleteCategory = output<string>();
    deleteTag = output<string>();
    assignCategoryToTag = output<{ tagId: string; categoryId: string }>();
    removeCategoryFromTag = output<{ tagId: string; categoryId: string }>();

    readonly isCategoryDialogOpen = signal(false);
    readonly categoryDialogType = signal<CategoryDialogType>('income');
    readonly categoryDialogTitle = computed(() =>
        this.categoryDialogType() === 'income'
            ? 'Новая категория доходов'
            : 'Новая категория расходов',
    );
    readonly categoryDialogName = computed(() =>
        this.categoryDialogType() === 'income'
            ? this.newIncomeCategory()
            : this.newExpenseCategory(),
    );
    readonly categoryDialogColor = computed(() =>
        this.categoryDialogType() === 'income'
            ? this.newIncomeCategoryColor()
            : this.newExpenseCategoryColor(),
    );

    openCategoryDialog(type: CategoryDialogType): void {
        this.categoryDialogType.set(type);
        this.isCategoryDialogOpen.set(true);
    }

    closeCategoryDialog(): void {
        this.isCategoryDialogOpen.set(false);
    }

    onCategoryDialogBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeCategoryDialog();
        }
    }

    setCategoryDialogName(value: string): void {
        if (this.categoryDialogType() === 'income') {
            this.newIncomeCategoryChange.emit(value);
        } else {
            this.newExpenseCategoryChange.emit(value);
        }
    }

    setCategoryDialogColor(value: string): void {
        if (this.categoryDialogType() === 'income') {
            this.newIncomeCategoryColorChange.emit(value);
        } else {
            this.newExpenseCategoryColorChange.emit(value);
        }
    }

    submitCategoryDialog(): void {
        if (!this.categoryDialogName().trim() || this.saving()) {
            return;
        }

        if (this.categoryDialogType() === 'income') {
            this.addIncomeCategory.emit();
        } else {
            this.addExpenseCategory.emit();
        }

        this.closeCategoryDialog();
    }

    categoryOptionsForTag(group: TagGroupItem): ReadonlyArray<MsSelectOption> {
        const assignedIds = new Set(group.categories.map((category) => category.id));

        return this.categoryOptions().filter((option) => !assignedIds.has(option.value));
    }

    onAssignCategoryToTag(tagId: string, categoryId: string): void {
        if (!categoryId) {
            return;
        }

        this.assignCategoryToTag.emit({ tagId, categoryId });
    }

    readColor(event: Event): string {
        return (event.target as HTMLInputElement | null)?.value || '#23c78b';
    }
}
