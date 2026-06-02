import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    contentChild,
    forwardRef,
    input,
    output,
    signal,
    TemplateRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'ms-input',
    standalone: true,
    templateUrl: './input.html',
    styleUrl: './input.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgTemplateOutlet],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => InputComponent),
            multi: true,
        },
    ],
})
export class InputComponent implements ControlValueAccessor {
    beforeInputTemplate = contentChild<TemplateRef<any>>('beforeInput');
    afterInputTemplate = contentChild<TemplateRef<any>>('afterInput');

    id = input<string>('');
    name = input<string>('');
    autocomplete = input<string>('');
    placeholder = input<string>('');
    type = input<'text' | 'email' | 'password'>('text');
    disabled = input<boolean>(false);
    readonly = input<boolean>(false);
    hidden = input<boolean>(false);
    invalid = input<boolean>(false);
    tabIndex = input<number>(0);

    icon = input<string | null>(null);
    iconAlt = input<string>('');
    actionIcon = input<string | null>(null);
    actionAriaLabel = input<string>('');
    actionDisabled = input<boolean>(false);

    action = output<void>();

    touched = signal(false);
    value = signal('');

    private isDisabledByForms = false;
    private onChange: (value: string) => void = () => {};
    private onTouched: () => void = () => {};

    get isDisabled(): boolean {
        return this.disabled() || this.isDisabledByForms;
    }

    writeValue(value: string | null): void {
        this.value.set(value ?? '');
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabledByForms = isDisabled;
    }

    onInput(event: Event): void {
        const target = event.target as HTMLInputElement | null;
        const nextValue = target?.value ?? '';
        this.value.set(nextValue);
        this.onChange(nextValue);
    }

    onFocus(): void {
        this.touched.set(true);
        this.onTouched();
    }
}
