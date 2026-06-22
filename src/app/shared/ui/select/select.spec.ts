import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectComponent } from './select';

describe('SelectComponent', () => {
    let fixture: ComponentFixture<SelectComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SelectComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SelectComponent);
        fixture.componentRef.setInput('options', [
            { value: 'BYN', label: 'BYN - Белорусский рубль' },
            { value: 'EUR', label: 'EUR - Евро' },
            { value: 'USD', label: 'USD - Доллар США' },
        ]);
        fixture.componentRef.setInput('value', 'BYN');
    });

    it('does not clip the dropdown options when the select is open', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('.ms-select__trigger')?.click();
        fixture.detectChanges();

        const shell = host.querySelector<HTMLElement>('.ms-select__shell');

        expect(host.querySelectorAll('.ms-select__option')).toHaveLength(3);
        expect(getComputedStyle(shell!).overflow).toBe('visible');
    });

    it('filters searchable options by label prefix while the dropdown is open', () => {
        fixture.componentRef.setInput('options', [
            { value: 'snacks', label: 'Snacks' },
            { value: 'late-snacks', label: 'Late Snacks' },
            { value: 'salary', label: 'Salary' },
        ]);
        fixture.componentRef.setInput('value', '');
        fixture.componentRef.setInput('searchable', true);
        fixture.componentRef.setInput('searchPlaceholder', 'Search category');
        fixture.componentRef.setInput('emptyText', 'No matches');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('.ms-select__trigger')?.click();
        fixture.detectChanges();

        const searchInput = host.querySelector<HTMLInputElement>('.ms-select__search-input');

        expect(searchInput).not.toBeNull();
        expect(searchInput?.placeholder).toBe('Search category');

        searchInput!.value = 'sna';
        searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        const matchingLabels = Array.from(host.querySelectorAll<HTMLElement>('.ms-select__option'))
            .map((option) => option.textContent?.trim())
            .filter(Boolean);

        expect(matchingLabels).toEqual(['Snacks']);

        searchInput!.value = 'rent';
        searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        expect(host.querySelectorAll('.ms-select__option')).toHaveLength(0);
        expect(host.querySelector('.ms-select__empty')?.textContent?.trim()).toBe('No matches');
    });

    it('resets searchable text when the dropdown closes', () => {
        fixture.componentRef.setInput('searchable', true);
        fixture.detectChanges();

        const component = fixture.componentInstance;

        component.searchText.set('eur');
        component.isOpen.set(true);

        component.onEscape();

        expect(component.isOpen()).toBe(false);
        expect(component.searchText()).toBe('');
    });

    it('allows the selected value to wrap when requested', () => {
        fixture.componentRef.setInput('valueWrap', true);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const trigger = host.querySelector<HTMLElement>('.ms-select__trigger');
        const value = host.querySelector<HTMLElement>('.ms-select__value');

        expect(host.classList.contains('ms-select-host--wrap-value')).toBe(true);
        expect(getComputedStyle(trigger!).minHeight).toBe('56px');
        expect(getComputedStyle(value!).whiteSpace).toBe('normal');
        expect(getComputedStyle(value!).overflow).toBe('visible');
        expect(getComputedStyle(value!).textOverflow).toBe('clip');
    });

    it('can place the dropdown above the trigger when requested', () => {
        fixture.componentRef.setInput('dropdownPlacement', 'top');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('.ms-select__trigger')?.click();
        fixture.detectChanges();

        const dropdown = host.querySelector<HTMLElement>('.ms-select__dropdown');
        const dropdownStyles = getComputedStyle(dropdown!);

        expect(host.classList.contains('ms-select-host--dropdown-top')).toBe(true);
        expect(dropdownStyles.top).toBe('auto');
        expect(dropdownStyles.bottom).toBe('calc(100% + 0.55rem)');
        expect(dropdownStyles.transformOrigin).toBe('bottom center');
    });

    it('closes without throwing when a document click target is not a DOM node', () => {
        fixture.detectChanges();

        const component = fixture.componentInstance;
        const event = new Event('click');

        component.isOpen.set(true);
        Object.defineProperty(event, 'target', {
            value: new EventTarget(),
        });

        expect(() => component.onDocumentClick(event)).not.toThrow();
        expect(component.isOpen()).toBe(false);
    });
});
