import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';

@Component({
    selector: 'ms-input',
    standalone: true,
    templateUrl: './input.component.html',
    styleUrl: './input.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements FormValueControl<string> {
    placeholder = input<string>('');
    disabled = input<boolean>(false);
    readonly = input<boolean>(false);
    hidden = input<boolean>(false);
    invalid = input<boolean>(false);
    tabIndex = input<number>(0);
    errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);

    touched = model<boolean>(false);
    value = model<string>('');
}
