import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'ms-color-field',
    template: `
        <label>
            <span>Цвет</span>
            <input
                #picker
                type="color"
                [attr.data-testid]="testId() || null"
                [value]="color()"
                [disabled]="disabled()"
                (input)="colorChange.emit(picker.value)"
            />
        </label>
    `,
    styleUrl: './color-field.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorFieldComponent {
    color = input.required<string>();
    disabled = input(false);
    testId = input('');
    colorChange = output<string>();
}
