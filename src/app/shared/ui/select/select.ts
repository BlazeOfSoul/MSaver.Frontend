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
    viewChild,
} from '@angular/core';

export interface MsSelectOption {
    value: string;
    label: string;
    description?: string;
    color?: string;
}

export type MsSelectDropdownPlacement = 'bottom' | 'top';

@Component({
    selector: 'ms-select',
    standalone: true,
    templateUrl: './select.html',
    styleUrls: ['./select.css', './select.dropdown.css', './select.search.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.ms-select-host--open]': 'isOpen()',
        '[class.ms-select-host--wrap-value]': 'valueWrap()',
        '[class.ms-select-host--dropdown-top]': 'dropdownPlacement() === "top"',
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
    valueWrap = input<boolean>(false);
    dropdownPlacement = input<MsSelectDropdownPlacement>('bottom');
    searchable = input<boolean>(false);
    searchPlaceholder = input<string>('');
    emptyText = input<string>('');

    readonly isOpen = signal(false);
    readonly searchText = signal('');
    private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
    readonly selectedOption = computed(() => {
        const match = this.options().find((option) => option.value === this.value());

        if (match) {
            return match;
        }

        return this.placeholder() ? { value: '', label: this.placeholder() } : null;
    });
    readonly filteredOptions = computed(() => {
        const searchText = this.normalizeSearchValue(this.searchText());

        if (!this.searchable() || !searchText) {
            return this.options();
        }

        return this.options().filter((option) =>
            this.normalizeSearchValue(option.label).startsWith(searchText),
        );
    });

    valueChange = output<string>();

    toggle(): void {
        if (this.disabled()) {
            return;
        }

        if (this.isOpen()) {
            this.closeDropdown();
            return;
        }

        this.openDropdown();
    }

    selectOption(option: MsSelectOption): void {
        if (this.disabled()) {
            return;
        }

        this.valueChange.emit(option.value);
        this.closeDropdown();
    }

    onSearchInput(event: Event): void {
        const target = event.target;

        this.searchText.set(target instanceof HTMLInputElement ? target.value : '');
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target;

        if (target instanceof Node && this.host.nativeElement.contains(target)) {
            return;
        }

        this.closeDropdown();
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.closeDropdown();
    }

    private openDropdown(): void {
        this.searchText.set('');
        this.isOpen.set(true);
        this.focusSearchInput();
    }

    private closeDropdown(): void {
        this.isOpen.set(false);
        this.searchText.set('');
    }

    private focusSearchInput(): void {
        if (!this.searchable()) {
            return;
        }

        setTimeout(() => this.searchInput()?.nativeElement.focus());
    }

    private normalizeSearchValue(value: string): string {
        return value.trim().toLocaleLowerCase();
    }
}
