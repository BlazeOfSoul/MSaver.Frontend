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

export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'success' | 'danger';
export type ButtonAppearance =
    | 'solid'
    | 'outline'
    | 'ghost'
    | 'plain'
    | 'icon'
    | 'tab'
    | 'chip'
    | 'sort';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
    selector: 'ms-button',
    standalone: true,
    imports: [],
    templateUrl: './button.html',
    styleUrl: './button.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.ms-btn]': 'true',
        '[class.ms-btn-primary]': 'variant() === "primary"',
        '[class.ms-btn-secondary]': 'variant() === "secondary"',
        '[class.ms-btn-neutral]': 'variant() === "neutral"',
        '[class.ms-btn-success]': 'variant() === "success"',
        '[class.ms-btn-danger]': 'variant() === "danger"',
        '[class.ms-btn-solid]': 'resolvedAppearance() === "solid"',
        '[class.ms-btn-outline]': 'resolvedAppearance() === "outline"',
        '[class.ms-btn-ghost]': 'resolvedAppearance() === "ghost"',
        '[class.ms-btn-plain]': 'resolvedAppearance() === "plain"',
        '[class.ms-btn-icon]': 'resolvedAppearance() === "icon"',
        '[class.ms-btn-tab]': 'resolvedAppearance() === "tab"',
        '[class.ms-btn-chip]': 'resolvedAppearance() === "chip"',
        '[class.ms-btn-sort]': 'resolvedAppearance() === "sort"',
        '[class.ms-btn-xs]': 'size() === "xs"',
        '[class.ms-btn-sm]': 'size() === "sm"',
        '[class.ms-btn-md]': 'size() === "md"',
        '[class.ms-btn-lg]': 'size() === "lg"',
        '[class.ms-btn-active]': 'active()',
        '[class.ms-btn-disabled]': 'disabled() || loading()',
        '[class.ms-btn-loading]': 'loading()',
        '[class.ms-btn-full-width]': 'fullWidth()',
        '[attr.role]': 'role()',
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

    label = input<string>('');
    appearance = input<ButtonAppearance>('solid');
    outlined = input(false, { transform: booleanAttribute });
    active = input(false, { transform: booleanAttribute });
    disabled = input(false, { transform: booleanAttribute });
    loading = input(false, { transform: booleanAttribute });
    fullWidth = input(false, { transform: booleanAttribute });
    variant = input<ButtonVariant>('primary');
    size = input<ButtonSize>('md');
    role = input<string>('button');
    tabindex = input(0, { transform: numberAttribute });
    type = input('button', { transform: this.buttonTypeAttribute });

    onClickEvent = output<Event>({ alias: 'onClick' });

    onAction(event: Event) {
        event.stopPropagation();

        if (this.disabled() || this.loading()) return;

        if (this.type() === 'submit') this.submitClosestForm();
        if (this.type() === 'reset') this.el.nativeElement.closest('form')?.reset();

        this.onClickEvent.emit(event);
    }

    protected resolvedAppearance(): ButtonAppearance {
        if (this.outlined()) {
            return 'outline';
        }

        return this.appearance();
    }

    private submitClosestForm(): void {
        const formElement = this.el.nativeElement.closest('form');

        if (!formElement) {
            return;
        }

        if (typeof formElement.requestSubmit === 'function') {
            formElement.requestSubmit();
            return;
        }

        formElement.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    }

    private buttonTypeAttribute(value: unknown): ButtonType {
        if (value === 'submit') return 'submit';
        if (value === 'reset') return 'reset';

        return 'button';
    }
}
