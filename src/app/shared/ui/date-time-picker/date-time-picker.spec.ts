import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateTimePickerComponent } from './date-time-picker';

describe('DateTimePickerComponent', () => {
    let fixture: ComponentFixture<DateTimePickerComponent>;
    let component: DateTimePickerComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DateTimePickerComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DateTimePickerComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('value', '2026-06-05T00:00');
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows one local date-time trigger and opens the app-styled picker', () => {
        const host = fixture.nativeElement as HTMLElement;
        const triggerValue = host.querySelector<HTMLElement>('.ms-date-time-picker__trigger-input');

        expect(triggerValue?.textContent?.trim()).toBe('05.06.2026 00:00');
        expect(host.querySelector('.ms-date-time-picker__dropdown')).toBeNull();
        expect(host.querySelector('input[type="datetime-local"]')).toBeNull();

        host.querySelector<HTMLButtonElement>('.ms-date-time-picker__trigger')?.click();
        fixture.detectChanges();

        const dropdown = host.querySelector<HTMLElement>('.ms-date-time-picker__dropdown');

        expect(dropdown).not.toBeNull();
        expect(getComputedStyle(dropdown!).position).toBe('absolute');
        expect(host.querySelector('input[type="date"]')).toBeNull();
        expect(host.querySelector('input[type="time"]')).toBeNull();
    });

    it('masks date and time text and emits a local ISO value only when each part is valid', () => {
        const valueSpy = vi.fn();
        component.valueChange.subscribe(valueSpy);
        component.toggle();
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const dateInput = host.querySelector<HTMLInputElement>('.ms-date-time-picker__date-input')!;
        const timeInput = host.querySelector<HTMLInputElement>('.ms-date-time-picker__time-input')!;

        dateInput.value = '080720266666';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));

        expect(dateInput.value).toBe('08.07.2026');
        expect(component.dateText()).toBe('08.07.2026');
        expect(valueSpy).toHaveBeenLastCalledWith('2026-07-08T00:00');

        timeInput.value = '0945';
        timeInput.dispatchEvent(new Event('input', { bubbles: true }));

        expect(timeInput.value).toBe('09:45');
        expect(component.timeText()).toBe('09:45');
        expect(valueSpy).toHaveBeenLastCalledWith('2026-07-08T09:45');
    });

    it('allows clearing incomplete fields without replacing the last valid value', () => {
        const valueSpy = vi.fn();
        const validitySpy = vi.fn();
        component.valueChange.subscribe(valueSpy);
        component.validityChange.subscribe(validitySpy);
        component.toggle();
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const dateInput = host.querySelector<HTMLInputElement>('.ms-date-time-picker__date-input')!;
        const timeInput = host.querySelector<HTMLInputElement>('.ms-date-time-picker__time-input')!;

        dateInput.value = '';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        timeInput.value = '';
        timeInput.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        expect(component.dateText()).toBe('');
        expect(component.timeText()).toBe('');
        expect(component.valid()).toBe(false);
        expect(component.showError()).toBe(true);
        expect(valueSpy).not.toHaveBeenCalled();
        expect(validitySpy).toHaveBeenLastCalledWith(false);
        expect(host.querySelector('.ms-date-time-picker__error')?.textContent).toContain(
            'существующие дату и время',
        );
    });

    it('uses the device-local clock for Today, Yesterday and Now shortcuts', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 18, 9, 5));
        const valueSpy = vi.fn();
        component.valueChange.subscribe(valueSpy);

        component.setDateOffset(0);
        expect(valueSpy).toHaveBeenLastCalledWith('2026-07-18T00:00');

        component.setDateOffset(-1);
        expect(valueSpy).toHaveBeenLastCalledWith('2026-07-17T00:00');

        component.setTimeToNow();
        expect(valueSpy).toHaveBeenLastCalledWith('2026-07-17T09:05');
    });

    it('synchronizes display fields when the parent value changes', () => {
        fixture.componentRef.setInput('value', '2026-12-31T23:59');
        fixture.detectChanges();

        expect(component.displayValue()).toBe('31.12.2026 23:59');
        expect(component.dateText()).toBe('31.12.2026');
        expect(component.timeText()).toBe('23:59');
    });

    it('uses valid popup semantics without nesting an input inside the trigger button', () => {
        const host = fixture.nativeElement as HTMLElement;
        const trigger = host.querySelector<HTMLButtonElement>('.ms-date-time-picker__trigger')!;

        expect(trigger.querySelector('input')).toBeNull();
        expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
        expect(trigger.getAttribute('aria-labelledby')).toContain(component.labelId);
        expect(trigger.getAttribute('aria-controls')).toBe(component.popupId);

        trigger.click();
        fixture.detectChanges();

        const popup = host.querySelector<HTMLElement>('.ms-date-time-picker__dropdown');

        expect(popup?.id).toBe(component.popupId);
        expect(popup?.getAttribute('role')).toBe('dialog');
        expect(popup?.getAttribute('aria-labelledby')).toBe(component.labelId);
    });

    it('focuses the date field on open and lets Escape close only the picker', async () => {
        const host = fixture.nativeElement as HTMLElement;
        const trigger = host.querySelector<HTMLButtonElement>('.ms-date-time-picker__trigger')!;
        const bubbledEscapeSpy = vi.fn();
        host.parentElement?.addEventListener('keydown', bubbledEscapeSpy);

        trigger.click();
        fixture.detectChanges();
        await Promise.resolve();

        const dateInput = host.querySelector<HTMLInputElement>('.ms-date-time-picker__date-input')!;
        expect(document.activeElement).toBe(dateInput);

        dateInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();
        await Promise.resolve();

        expect(host.querySelector('.ms-date-time-picker__dropdown')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        expect(bubbledEscapeSpy).not.toHaveBeenCalled();
    });

    it('closes on pointer interaction outside without stealing the new focus target', () => {
        const host = fixture.nativeElement as HTMLElement;
        host.querySelector<HTMLButtonElement>('.ms-date-time-picker__trigger')?.click();
        fixture.detectChanges();

        expect(component.open()).toBe(true);

        document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        fixture.detectChanges();

        expect(component.open()).toBe(false);
        expect(host.querySelector('.ms-date-time-picker__dropdown')).toBeNull();
    });
});
