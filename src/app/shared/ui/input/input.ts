import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    contentChild,
    input,
    model,
    signal,
    TemplateRef,
} from '@angular/core';
import { FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';

@Component({
    selector: 'ms-input',
    standalone: true,
    templateUrl: './input.html',
    styleUrl: './input.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgTemplateOutlet],
})
export class Input implements FormValueControl<string> {
    beforeInputTemplate = contentChild<TemplateRef<any>>('beforeInput');
    afterInputTemplate = contentChild<TemplateRef<any>>('afterInput');

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
