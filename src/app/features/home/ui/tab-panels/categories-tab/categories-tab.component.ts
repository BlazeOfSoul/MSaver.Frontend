import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption } from '../../../../../shared/ui/select/select';
import { CategoryGroupPanelComponent } from '../../components/category-group-panel/category-group-panel.component';
import { NameColorDialogComponent } from '../../components/name-color-dialog/name-color-dialog.component';
import { TagGroupCardComponent } from '../../components/tag-group-card/tag-group-card.component';
import { CategoryBreakdownItem, TagGroupItem } from '../../home-page.models';

type CategoryDialogType = 'income' | 'expense';

@Component({
    selector: 'ms-categories-tab',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        Button,
        InputComponent,
        CategoryGroupPanelComponent,
        NameColorDialogComponent,
        TagGroupCardComponent,
    ],
    templateUrl: './categories-tab.component.html',
    styleUrls: [
        './categories-tab.component.css',
        './categories-tab.part-2.css',
        './categories-tab.part-3.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesTabComponent {
    incomeCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    expenseCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    tagGroups = input.required<ReadonlyArray<TagGroupItem>>();
    newIncomeCategory = input.required<string>();
    newExpenseCategory = input.required<string>();
    newTagGroup = input.required<string>();
    newTagGroupColor = input.required<string>();
    newIncomeCategoryColor = input.required<string>();
    newExpenseCategoryColor = input.required<string>();
    categoryOptions = input.required<ReadonlyArray<MsSelectOption>>();
    searchControl = input.required<FormControl<string>>();
    saving = input(false);

    newIncomeCategoryChange = output<string>();
    newExpenseCategoryChange = output<string>();
    newTagGroupChange = output<string>();
    newTagGroupColorChange = output<string>();
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
    readonly isTagDialogOpen = signal(false);
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

    readonly tagDialogName = computed(() => this.newTagGroup());
    readonly tagDialogColor = computed(() => this.newTagGroupColor());

    openCategoryDialog(type: CategoryDialogType): void {
        this.categoryDialogType.set(type);
        this.isCategoryDialogOpen.set(true);
    }

    closeCategoryDialog(): void {
        this.isCategoryDialogOpen.set(false);
    }

    openTagDialog(): void {
        this.isTagDialogOpen.set(true);
    }

    closeTagDialog(): void {
        this.isTagDialogOpen.set(false);
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

    setTagDialogName(value: string): void {
        this.newTagGroupChange.emit(value);
    }

    setTagDialogColor(value: string): void {
        this.newTagGroupColorChange.emit(value);
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

    submitTagDialog(): void {
        if (!this.tagDialogName().trim() || this.saving()) {
            return;
        }

        this.addTagGroup.emit();
        this.closeTagDialog();
    }

    categoryOptionsForTag(group: TagGroupItem): ReadonlyArray<MsSelectOption> {
        const assignedIds = new Set(group.categories.map((category) => category.id));

        return this.categoryOptions().filter((option) => !assignedIds.has(option.value));
    }

}
