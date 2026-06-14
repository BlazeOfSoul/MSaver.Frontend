import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
import { Button } from '../../../../../shared/ui/button/button';
import { DialogShellComponent } from '../../../../../shared/ui/dialog-shell/dialog-shell';
import { InputComponent } from '../../../../../shared/ui/input/input';

export type NameColorDialogPreviewKind = 'category' | 'tag';

@Component({
    selector: 'ms-name-color-dialog',
    standalone: true,
    imports: [FormsModule, Button, DialogShellComponent, InputComponent],
    templateUrl: './name-color-dialog.component.html',
    styleUrls: [
        './name-color-dialog.component.css',
        './name-color-dialog.part-2.css',
        './name-color-dialog.part-3.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NameColorDialogComponent {
    title = input.required<string>();
    description = input.required<string>();
    placeholder = input.required<string>();
    name = input.required<string>();
    color = input.required<string>();
    fallbackName = input.required<string>();
    previewKind = input.required<NameColorDialogPreviewKind>();
    colorPickerTestId = input.required<string>();
    submitTestId = input.required<string>();
    saving = input(false);

    closed = output<void>();
    submit = output<void>();
    nameChange = output<string>();
    colorChange = output<string>();

    submitDialog(): void {
        if (!this.name().trim() || this.saving()) {
            return;
        }

        this.submit.emit();
    }

    readColor(event: Event): string {
        return event.target instanceof HTMLInputElement
            ? event.target.value || MS_CATEGORY_COLORS[0]
            : MS_CATEGORY_COLORS[0];
    }
}
