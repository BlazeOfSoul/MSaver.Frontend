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
});
