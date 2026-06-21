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
