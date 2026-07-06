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

type CategoryDialogType = 'income' | 'expense';
type CategorySubtab = 'items' | 'order';
type DragShiftDirection = 'up' | 'down';
type RecentlyMovedCategory = {
    id: string;
    direction: CategoryMoveDirection;
};

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
    resetCategoryOrder = output<void>();

    readonly activeSubtab = signal<CategorySubtab>('items');
    readonly isCategoryDialogOpen = signal(false);
    readonly isTagDialogOpen = signal(false);
    readonly recentlyMovedCategory = signal<RecentlyMovedCategory | null>(null);
    readonly draggedCategoryId = signal<string | null>(null);
    readonly dragOverCategoryId = signal<string | null>(null);
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
    readonly canMoveCategoryByOrder = (
        category: CategoryBreakdownItem,
        direction: CategoryMoveDirection,
    ) => this.canMoveCategory(category, direction);

    private movedTimeoutId: number | null = null;

    ngOnDestroy(): void {
        this.clearMovedTimeout();
    }

    setActiveSubtab(tab: CategorySubtab): void {
        this.activeSubtab.set(tab);
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

        if (
            index < 0 ||
            swapIndex < 0 ||
            swapIndex >= sameTypeCategories.length
        ) {
            return false;
        }

        return true;
    }

    moveCategoryFromOrder(categoryId: string, direction: CategoryMoveDirection): void {
        this.recentlyMovedCategory.set({ id: categoryId, direction });
        this.clearMovedTimeout();
        this.movedTimeoutId = window.setTimeout(() => {
            this.movedTimeoutId = null;
            this.recentlyMovedCategory.set(null);
        }, 220);
        this.moveCategory.emit({ categoryId, direction });
    }

    startCategoryDrag(event: DragEvent, category: CategoryBreakdownItem): void {
        if (this.saving()) {
            event.preventDefault();
            return;
        }

        this.draggedCategoryId.set(category.id);
        this.dragOverCategoryId.set(category.id);
        event.dataTransfer?.setData('text/plain', category.id);

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
        }
    }

    dragCategoryOver(event: DragEvent, category: CategoryBreakdownItem): void {
        if (!this.canDropCategoryOn(category)) {
            return;
        }

        event.preventDefault();
        this.dragOverCategoryId.set(category.id);

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    dropCategoryOn(event: DragEvent, category: CategoryBreakdownItem): void {
        event.preventDefault();
        this.dropDraggedCategoryOn(category);
    }

    startCategoryPointerDrag(event: PointerEvent, category: CategoryBreakdownItem): void {
        if (this.saving()) {
            return;
        }

        event.preventDefault();
        this.draggedCategoryId.set(category.id);
        this.dragOverCategoryId.set(category.id);
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    }

    moveCategoryPointerDrag(event: PointerEvent): void {
        const targetCategory = this.categoryFromPoint(event.clientX, event.clientY);

        if (!targetCategory || !this.canDropCategoryOn(targetCategory)) {
            return;
        }

        event.preventDefault();
        this.dragOverCategoryId.set(targetCategory.id);
    }

    dropCategoryPointerDrag(event: PointerEvent): void {
        const targetCategory = this.categoryFromPoint(event.clientX, event.clientY);

        (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);

        if (!targetCategory) {
            this.clearCategoryDrag();
            return;
        }

        this.dropDraggedCategoryOn(targetCategory);
    }

    endCategoryDrag(): void {
        this.clearCategoryDrag();
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

    isDraggedCategory(category: CategoryBreakdownItem): boolean {
        return this.draggedCategoryId() === category.id;
    }

    dragShiftDirection(
        category: CategoryBreakdownItem,
        items: ReadonlyArray<CategoryBreakdownItem>,
    ): DragShiftDirection | null {
        const draggedCategoryId = this.draggedCategoryId();
        const dragOverCategoryId = this.dragOverCategoryId();

        if (!draggedCategoryId || !dragOverCategoryId || category.id === draggedCategoryId) {
            return null;
        }

        const fromIndex = items.findIndex((item) => item.id === draggedCategoryId);
        const toIndex = items.findIndex((item) => item.id === dragOverCategoryId);
        const index = items.findIndex((item) => item.id === category.id);

        if (fromIndex < 0 || toIndex < 0 || index < 0 || fromIndex === toIndex) {
            return null;
        }

        if (fromIndex < toIndex && index > fromIndex && index <= toIndex) {
            return 'up';
        }

        if (fromIndex > toIndex && index >= toIndex && index < fromIndex) {
            return 'down';
        }

        return null;
    }

    movedClass(categoryId: string): string | null {
        const recentlyMoved = this.recentlyMovedCategory();

        if (!recentlyMoved || recentlyMoved.id !== categoryId) {
            return null;
        }

        return `category-order-row--move-${recentlyMoved.direction}`;
    }

    private dropDraggedCategoryOn(category: CategoryBreakdownItem): void {
        const draggedCategory = this.draggedCategory();

        if (!draggedCategory || draggedCategory.type !== category.type) {
            this.clearCategoryDrag();
            return;
        }

        const sameTypeCategories = this.categoryOrderItems().filter(
            (item) => item.type === draggedCategory.type,
        );
        const fromIndex = sameTypeCategories.findIndex((item) => item.id === draggedCategory.id);
        const toIndex = sameTypeCategories.findIndex((item) => item.id === category.id);

        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
            this.clearCategoryDrag();
            return;
        }

        const direction: CategoryMoveDirection = fromIndex > toIndex ? 'up' : 'down';
        const moveCount = Math.abs(fromIndex - toIndex);

        for (let index = 0; index < moveCount; index++) {
            this.moveCategoryFromOrder(draggedCategory.id, direction);
        }

        this.clearCategoryDrag();
    }

    private draggedCategory(): CategoryBreakdownItem | null {
        const draggedCategoryId = this.draggedCategoryId();

        if (!draggedCategoryId) {
            return null;
        }

        return (
            this.categoryOrderItems().find((category) => category.id === draggedCategoryId) ?? null
        );
    }

    private categoryFromPoint(clientX: number, clientY: number): CategoryBreakdownItem | null {
        const row = document
            .elementFromPoint(clientX, clientY)
            ?.closest<HTMLElement>('[data-category-id]');
        const categoryId = row?.dataset['categoryId'];

        if (!categoryId) {
            return null;
        }

        return this.categoryOrderItems().find((category) => category.id === categoryId) ?? null;
    }

    private canDropCategoryOn(category: CategoryBreakdownItem): boolean {
        const draggedCategory = this.draggedCategory();

        return !!draggedCategory && draggedCategory.type === category.type && !this.saving();
    }

    private clearCategoryDrag(): void {
        this.draggedCategoryId.set(null);
        this.dragOverCategoryId.set(null);
    }

    private clearMovedTimeout(): void {
        if (this.movedTimeoutId === null) {
            return;
        }

        window.clearTimeout(this.movedTimeoutId);
        this.movedTimeoutId = null;
    }
}
