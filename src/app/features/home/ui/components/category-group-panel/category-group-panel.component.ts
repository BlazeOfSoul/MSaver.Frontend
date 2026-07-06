import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { CategoryMoveDirection } from '../../home-category-order.utils';
import { CategoryBreakdownItem } from '../../home-page.models';

type CanMoveCategory = (
    category: CategoryBreakdownItem,
    direction: CategoryMoveDirection,
    index: number,
    count: number,
) => boolean;

const defaultCanMoveCategory: CanMoveCategory = (_category, direction, index, count) =>
    direction === 'up' ? index > 0 : index < count - 1;

@Component({
    selector: 'ms-category-group-panel',
    standalone: true,
    imports: [Button],
    templateUrl: './category-group-panel.component.html',
    styleUrl: './category-group-panel.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryGroupPanelComponent {
    title = input.required<string>();
    description = input.required<string>();
    addButtonTestId = input.required<string>();
    addButtonAriaLabel = input.required<string>();
    railAriaLabel = input.required<string>();
    emptyText = input.required<string>();
    categories = input.required<ReadonlyArray<CategoryBreakdownItem>>();
    canMoveCategory = input<CanMoveCategory>(defaultCanMoveCategory);
    saving = input(false);

    add = output<void>();
    deleteCategory = output<string>();
    moveCategory = output<{ categoryId: string; direction: CategoryMoveDirection }>();
}
