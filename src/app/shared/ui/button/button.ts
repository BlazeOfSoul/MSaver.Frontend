import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    inject,
    input,
    numberAttribute,
    output,
} from '@angular/core';

@Component({
    selector: 'ms-button',
    standalone: true,
    imports: [],
    templateUrl: './button.html',
    styleUrl: './button.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ms-btn',
        '[class]': '"ms-btn-" + variant()',
        '[class.ms-btn-outline]': 'outlined()',
        '[class.ms-btn-disabled]': 'disabled() || loading()',
        '[class.ms-btn-loading]': 'loading()',
        '[class.ms-btn-full-width]': 'fullWidth()',
        '[attr.aria-disabled]': 'disabled() || loading()',
        '[attr.aria-busy]': 'loading()',
        '[attr.tabindex]': 'disabled() || loading() ? -1 : tabindex()',
        '(click)': 'onAction($event)',
        '(keydown.enter)': 'onAction($event)',
        '(keydown.space)': 'onAction($event)',
    },
})
export class Button {
    private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly formElement = this.el.nativeElement.closest('form');

    label = input<string>('');
    outlined = input(false, { transform: booleanAttribute });
    disabled = input(false, { transform: booleanAttribute });
    loading = input(false, { transform: booleanAttribute });
    fullWidth = input(false, { transform: booleanAttribute });
    variant = input<'primary' | 'secondary'>('primary');
    tabindex = input(0, { transform: numberAttribute });
    type = input('button', { transform: this.buttonTypeAttribute });

    onClickEvent = output<Event>({ alias: 'onClick' });

    onAction(event: Event) {
        event.stopPropagation();

        if (this.disabled() || this.loading()) return;

        if (this.type() === 'submit') this.formElement?.requestSubmit();
        if (this.type() === 'reset') this.formElement?.reset();

        this.onClickEvent.emit(event);
    }

    private buttonTypeAttribute(value: unknown): 'button' | 'submit' | 'reset' {
        if (value === 'submit') return 'submit';
        if (value === 'reset') return 'reset';

        return 'button';
    }
}
