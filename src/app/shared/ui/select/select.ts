import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild,
    viewChildren,
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
        '[class.ms-select-host--contained]': 'contained()',
        '[class.ms-select-host--dropdown-top]': 'resolvedDropdownPlacement() === "top"',
    },
})
export class SelectComponent {
    private static nextInstanceId = 0;
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);
    private readonly automaticPlacement = signal<MsSelectDropdownPlacement | null>(null);
    readonly dropdownMaxHeight = signal<number | null>(null);
    readonly resolvedDropdownPlacement = computed(
        () => this.automaticPlacement() ?? this.dropdownPlacement(),
    );
    private removeViewportListeners: (() => void) | null = null;

    constructor() {
        this.destroyRef.onDestroy(() => this.removeViewportListeners?.());
    }

    options = input.required<ReadonlyArray<MsSelectOption>>();
    value = input<string>('');
    placeholder = input<string>('');
    label = input<string>('');
    icon = input<string>('expand_more');
    disabled = input<boolean>(false);
    valueWrap = input<boolean>(false);
    contained = input<boolean>(false);
    dropdownPlacement = input<MsSelectDropdownPlacement>('bottom');
    searchable = input<boolean>(false);
    searchPlaceholder = input<string>('');
    emptyText = input<string>('');

    readonly isOpen = signal(false);
    readonly searchText = signal('');
    readonly selectId = `ms-select-${SelectComponent.nextInstanceId++}`;
    readonly labelId = `${this.selectId}-label`;
    readonly listboxId = `${this.selectId}-listbox`;
    private readonly triggerButton = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');
    private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
    private readonly optionButtons = viewChildren<ElementRef<HTMLButtonElement>>('optionButton');
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
            this.normalizeSearchValue(`${option.label} ${option.description ?? ''}`).includes(
                searchText,
            ),
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

    onTriggerKeydown(event: KeyboardEvent): void {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!this.isOpen()) {
            this.openDropdown();
        }

        const selectedIndex = this.filteredOptions().findIndex(
            (option) => option.value === this.value(),
        );
        const fallbackIndex = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 0;
        const requestedIndex =
            event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? -1
                  : selectedIndex >= 0
                    ? selectedIndex
                    : fallbackIndex;

        this.focusOption(requestedIndex);
    }

    onSearchKeydown(event: KeyboardEvent): void {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.focusOption(event.key === 'ArrowDown' || event.key === 'Home' ? 0 : -1);
    }

    onOptionKeydown(event: KeyboardEvent, index: number): void {
        let nextIndex: number | null = null;

        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                nextIndex = index + 1;
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                nextIndex = index - 1;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = -1;
                break;
            default:
                return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.focusOption(nextIndex);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target;

        if (target instanceof Node && this.host.nativeElement.contains(target)) {
            return;
        }

        this.closeDropdown();
    }

    @HostListener('keydown.escape', ['$event'])
    onEscape(event: Event): void {
        if (!this.isOpen()) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.closeDropdown();
        this.triggerButton()?.nativeElement.focus();
    }

    optionId(index: number): string {
        return `${this.selectId}-option-${index}`;
    }

    private openDropdown(): void {
        this.searchText.set('');
        this.isOpen.set(true);
        this.updateDropdownPosition();
        const view = this.host.nativeElement.ownerDocument.defaultView;
        if (view) {
            const update = () => this.updateDropdownPosition();
            view.addEventListener('resize', update);
            view.addEventListener('scroll', update, true);
            view.visualViewport?.addEventListener('resize', update);
            view.visualViewport?.addEventListener('scroll', update);
            this.removeViewportListeners = () => {
                view.removeEventListener('resize', update);
                view.removeEventListener('scroll', update, true);
                view.visualViewport?.removeEventListener('resize', update);
                view.visualViewport?.removeEventListener('scroll', update);
            };
        }
        this.focusSearchInput();
    }

    private updateDropdownPosition(): void {
        const trigger = this.triggerButton()?.nativeElement;
        const view = trigger?.ownerDocument.defaultView;
        if (!trigger || !view) return;
        const bounds = trigger.getBoundingClientRect();
        // Contained mobile dropdowns participate in the form's own scrolling.
        if (!bounds.height || (this.contained() && view.innerWidth <= 480)) {
            this.automaticPlacement.set(null);
            this.dropdownMaxHeight.set(null);
            return;
        }
        const viewportTop = view.visualViewport?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (view.visualViewport?.height ?? view.innerHeight);
        const rem =
            parseFloat(view.getComputedStyle(trigger.ownerDocument.documentElement).fontSize) || 16;
        const desiredHeight = (view.innerWidth <= 480 ? 13 : 16) * rem;
        const margin = 0.55 * rem + 12;
        const above = Math.max(0, bounds.top - viewportTop - margin);
        const below = Math.max(0, viewportBottom - bounds.bottom - margin);
        const preferTop = this.dropdownPlacement() === 'top';
        const preferredSpace = preferTop ? above : below;
        const otherSpace = preferTop ? below : above;
        const flip = preferredSpace < desiredHeight && otherSpace > preferredSpace;
        const placeTop = flip ? !preferTop : preferTop;
        this.automaticPlacement.set(placeTop ? 'top' : 'bottom');
        this.dropdownMaxHeight.set(Math.min(desiredHeight, placeTop ? above : below));
    }

    private closeDropdown(): void {
        this.removeViewportListeners?.();
        this.removeViewportListeners = null;
        this.isOpen.set(false);
        this.searchText.set('');
    }

    private focusSearchInput(): void {
        if (!this.searchable() || this.isCoarsePointerDevice()) {
            return;
        }

        setTimeout(() => this.searchInput()?.nativeElement.focus());
    }

    private focusOption(index: number): void {
        setTimeout(() => {
            const buttons = this.optionButtons();
            if (!buttons.length) {
                return;
            }

            const nextIndex = index < 0 ? buttons.length - 1 : Math.min(index, buttons.length - 1);
            buttons[nextIndex]?.nativeElement.focus();
        });
    }

    private isCoarsePointerDevice(): boolean {
        return globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
    }

    private normalizeSearchValue(value: string): string {
        return value.trim().toLocaleLowerCase();
    }
}
