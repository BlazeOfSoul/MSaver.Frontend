import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputComponent } from './input';

describe('InputComponent', () => {
    let fixture: ComponentFixture<InputComponent>;
    let component: InputComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [InputComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(InputComponent);
        component = fixture.componentInstance;
    });

    it('updates the control value from native input events', () => {
        const changeSpy = vi.fn();
        component.registerOnChange(changeSpy);
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = 'Lunch';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(component.value()).toBe('Lunch');
        expect(changeSpy).toHaveBeenCalledWith('Lunch');
    });

    it('ignores input events that do not originate from an HTML input element', () => {
        const changeSpy = vi.fn();
        const event = new Event('input', { bubbles: true });
        const target = document.createElement('div');
        component.registerOnChange(changeSpy);
        component.writeValue('keep me');
        Object.defineProperty(event, 'target', { value: target });

        component.onInput(event);

        expect(component.value()).toBe('keep me');
        expect(changeSpy).not.toHaveBeenCalled();
    });
});
