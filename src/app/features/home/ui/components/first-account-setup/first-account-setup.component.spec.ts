import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectComponent } from '../../../../../shared/ui/select/select';
import { FirstAccountSetupComponent } from './first-account-setup.component';

describe('FirstAccountSetupComponent', () => {
    let fixture: ComponentFixture<FirstAccountSetupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FirstAccountSetupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(FirstAccountSetupComponent);
        fixture.componentRef.setInput('currencyOptions', [
            { value: 'BYN', label: 'BYN - Белорусский рубль' },
            { value: 'USD', label: 'USD - Доллар США' },
        ]);
        fixture.componentRef.setInput('selectedCurrency', 'BYN');
        fixture.componentRef.setInput('saving', false);
    });

    it('renders first account setup copy and selected currency', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const setup = host.querySelector<HTMLElement>('.first-account-setup');

        expect(setup?.getAttribute('role')).toBe('dialog');
        expect(setup?.getAttribute('aria-modal')).toBe('true');
        expect(host.querySelector('.first-account-setup__summary')).not.toBeNull();
        expect(host.textContent ?? '').toContain('Создайте основной счёт');
        expect(host.textContent ?? '').toContain('Валюта основного счёта');
        expect(host.textContent ?? '').toContain('BYN - Белорусский рубль');
    });

    it('emits currency and create actions', () => {
        const currencySpy = vi.fn();
        const createSpy = vi.fn();

        fixture.componentInstance.currencyChange.subscribe(currencySpy);
        fixture.componentInstance.createAccount.subscribe(createSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        fixture.debugElement.query(By.directive(SelectComponent)).componentInstance.valueChange.emit(
            'USD',
        );
        host.querySelector<HTMLElement>('ms-button')?.click();

        expect(currencySpy).toHaveBeenCalledWith('USD');
        expect(createSpy).toHaveBeenCalledOnce();
    });
});
