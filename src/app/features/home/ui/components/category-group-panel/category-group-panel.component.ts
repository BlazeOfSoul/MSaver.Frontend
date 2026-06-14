import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { CategoryBreakdownItem } from '../../home-page.models';

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
    saving = input(false);

    add = output<void>();
    deleteCategory = output<string>();
}
