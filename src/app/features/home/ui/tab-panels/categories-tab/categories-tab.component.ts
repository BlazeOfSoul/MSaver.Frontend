import { CdkDrag, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    computed,
    input,
    output,
    signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption } from '../../../../../shared/ui/select/select';
import { CategoryGroupPanelComponent } from '../../components/category-group-panel/category-group-panel.component';
import { NameColorDialogComponent } from '../../components/name-color-dialog/name-color-dialog.component';
import { TagGroupCardComponent } from '../../components/tag-group-card/tag-group-card.component';
import { CategoryMoveDirection } from '../../home-category-order.utils';
import { CategoryBreakdownItem, TagGroupItem } from '../../home-page.models';
import { PlanningTabComponent } from '../planning-tab/planning-tab.component';

type CategoryDialogType = 'income' | 'expense';
type CategorySubtab = 'items' | 'order' | 'budgets';
type RecentlyMovedCategory = {
    id: string;
    direction: CategoryMoveDirection;
};
type CategoryDropEvent = {
    previousIndex: number;
    currentIndex: number;
    item: {
        data: CategoryBreakdownItem;
    };
};

@Component({
    selector: 'ms-categories-tab',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        CdkDrag,
        CdkDragHandle,
        CdkDropList,
        Button,
        InputComponent,
        CategoryGroupPanelComponent,
        NameColorDialogComponent,
        TagGroupCardComponent,
        PlanningTabComponent,
    ],
    templateUrl: './categories-tab.component.html',
    styleUrls: [
        './categories-tab.component.css',
        './categories-tab.part-2.css',
        './categories-tab.part-3.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesTabComponent implements OnDestroy {
    incomeCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    expenseCategories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    incomeCategoryOrderItems = input<ReadonlyArray<CategoryBreakdownItem> | null>(null);
    expenseCategoryOrderItems = input<ReadonlyArray<CategoryBreakdownItem> | null>(null);
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
    budgetMonth = input(new Date());
    budgetAccountOptions = input<ReadonlyArray<MsSelectOption>>([]);

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
    moveCategory = output<{ categoryId: string; direction: CategoryMoveDirection }>();
    reorderCategories = output<ReadonlyArray<string>>();
    resetCategoryOrder = output<void>();

    readonly activeSubtab = signal<CategorySubtab>('items');
    readonly isCategoryDialogOpen = signal(false);
    readonly isTagDialogOpen = signal(false);
    readonly recentlyMovedCategory = signal<RecentlyMovedCategory | null>(null);
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
    readonly categoryOrderItems = computed(() => [
        ...(this.incomeCategoryOrderItems() ?? this.incomeCategories()),
        ...(this.expenseCategoryOrderItems() ?? this.expenseCategories()),
    ]);
    readonly categoryOrderSections = computed(() => [
        {
            id: 'income' as const,
            title: 'Доходы',
            emptyText: 'Категорий доходов пока нет.',
            items: this.incomeCategoryOrderItems() ?? this.incomeCategories(),
        },
        {
            id: 'expense' as const,
            title: 'Расходы',
            emptyText: 'Категорий расходов пока нет.',
            items: this.expenseCategoryOrderItems() ?? this.expenseCategories(),
        },
    ]);
    private movedTimeoutId: number | null = null;

    ngOnDestroy(): void {
        this.clearMovedTimeout();
    }

    setActiveSubtab(tab: CategorySubtab): void {
        this.activeSubtab.set(tab);
    }

    changeSubtabFromKeyboard(event: KeyboardEvent, currentTab: CategorySubtab): void {
        const tabs: ReadonlyArray<CategorySubtab> = ['items', 'order', 'budgets'];
        const currentIndex = tabs.indexOf(currentTab);
        let nextIndex = currentIndex;

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                nextIndex = (currentIndex + 1) % tabs.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = tabs.length - 1;
                break;
            default:
                return;
        }

        event.preventDefault();
        const nextTab = tabs[nextIndex];
        this.setActiveSubtab(nextTab);

        const tabButtons = (
            event.currentTarget as HTMLElement | null
        )?.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        tabButtons?.item(nextIndex).focus();
    }

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

    canMoveCategory(category: CategoryBreakdownItem, direction: CategoryMoveDirection): boolean {
        const sameTypeCategories = this.categoryOrderItems().filter(
            (item) => item.type === category.type,
        );
        const index = sameTypeCategories.findIndex((item) => item.id === category.id);
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        if (index < 0 || swapIndex < 0 || swapIndex >= sameTypeCategories.length) {
            return false;
        }

        return true;
    }

    moveCategoryFromOrder(categoryId: string, direction: CategoryMoveDirection): void {
        this.markCategoryMoved(categoryId, direction);
        this.moveCategory.emit({ categoryId, direction });
    }

    private markCategoryMoved(categoryId: string, direction: CategoryMoveDirection): void {
        this.recentlyMovedCategory.set({ id: categoryId, direction });
        this.clearMovedTimeout();
        this.movedTimeoutId = window.setTimeout(() => {
            this.movedTimeoutId = null;
            this.recentlyMovedCategory.set(null);
        }, 220);
    }

    dropCategoryOrder(event: CategoryDropEvent, items: ReadonlyArray<CategoryBreakdownItem>): void {
        if (this.saving()) {
            return;
        }

        if (event.previousIndex === event.currentIndex) {
            return;
        }

        const draggedCategory = event.item.data;

        if (
            !draggedCategory ||
            event.previousIndex < 0 ||
            event.currentIndex < 0 ||
            event.previousIndex >= items.length ||
            event.currentIndex >= items.length
        ) {
            return;
        }

        const direction: CategoryMoveDirection =
            event.previousIndex > event.currentIndex ? 'up' : 'down';
        const nextCategoryIds = this.reorderedCategoryIds(
            draggedCategory,
            items,
            event.previousIndex,
            event.currentIndex,
        );

        this.markCategoryMoved(draggedCategory.id, direction);
        this.reorderCategories.emit(nextCategoryIds);
    }

    reorderCategoryWithKeyboard(event: KeyboardEvent, category: CategoryBreakdownItem): void {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
            return;
        }

        const direction: CategoryMoveDirection = event.key === 'ArrowUp' ? 'up' : 'down';

        if (!this.canMoveCategory(category, direction)) {
            return;
        }

        event.preventDefault();
        this.moveCategoryFromOrder(category.id, direction);
    }

    movedClass(categoryId: string): string | null {
        const recentlyMoved = this.recentlyMovedCategory();

        if (!recentlyMoved || recentlyMoved.id !== categoryId) {
            return null;
        }

        return `category-order-row--move-${recentlyMoved.direction}`;
    }

    private reorderedCategoryIds(
        draggedCategory: CategoryBreakdownItem,
        sameTypeCategories: ReadonlyArray<CategoryBreakdownItem>,
        fromIndex: number,
        toIndex: number,
    ): string[] {
        const nextSameTypeCategories = [...sameTypeCategories];
        moveItemInArray(nextSameTypeCategories, fromIndex, toIndex);

        let typeIndex = 0;

        return this.categoryOrderItems().map((category) => {
            if (category.type !== draggedCategory.type) {
                return category.id;
            }

            const nextCategoryId = nextSameTypeCategories[typeIndex]?.id ?? category.id;
            typeIndex += 1;

            return nextCategoryId;
        });
    }

    private clearMovedTimeout(): void {
        if (this.movedTimeoutId === null) {
            return;
        }

        window.clearTimeout(this.movedTimeoutId);
        this.movedTimeoutId = null;
    }
}
