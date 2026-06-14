import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostListener,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';

export interface MsSelectOption {
    value: string;
    label: string;
    description?: string;
    color?: string;
}

@Component({
    selector: 'ms-select',
    standalone: true,
    templateUrl: './select.html',
    styleUrls: ['./select.css', './select.dropdown.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.ms-select-host--open]': 'isOpen()',
    },
})
export class SelectComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    options = input.required<ReadonlyArray<MsSelectOption>>();
    value = input<string>('');
    placeholder = input<string>('');
    label = input<string>('');
    icon = input<string>('expand_more');
    disabled = input<boolean>(false);

    readonly isOpen = signal(false);
    readonly selectedOption = computed(() => {
        const match = this.options().find((option) => option.value === this.value());

        if (match) {
            return match;
        }

        return this.placeholder() ? { value: '', label: this.placeholder() } : null;
    });

    valueChange = output<string>();

    toggle(): void {
        if (this.disabled()) {
            return;
        }

        this.isOpen.update((value) => !value);
    }

    selectOption(option: MsSelectOption): void {
        if (this.disabled()) {
            return;
        }

        this.valueChange.emit(option.value);
        this.isOpen.set(false);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target;

        if (target instanceof Node && this.host.nativeElement.contains(target)) {
            return;
        }

        this.isOpen.set(false);
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.isOpen.set(false);
    }
}
