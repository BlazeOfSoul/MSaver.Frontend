import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { TagGroupItem } from '../../home-page.models';

@Component({
    selector: 'ms-tag-group-card',
    standalone: true,
    imports: [Button, SelectComponent],
    templateUrl: './tag-group-card.component.html',
    styleUrl: './tag-group-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagGroupCardComponent {
    group = input.required<TagGroupItem>();
    availableCategoryOptions = input.required<ReadonlyArray<MsSelectOption>>();
    saving = input(false);
    readonly selectedCategoryId = signal('');

    deleteTag = output<string>();
    assignCategoryToTag = output<{ tagId: string; categoryId: string }>();
    removeCategoryFromTag = output<{ tagId: string; categoryId: string }>();

    onAssignCategory(categoryId: string): void {
        if (!categoryId || this.saving()) {
            return;
        }

        this.selectedCategoryId.set('');
        this.assignCategoryToTag.emit({
            tagId: this.group().id,
            categoryId,
        });
    }
}
