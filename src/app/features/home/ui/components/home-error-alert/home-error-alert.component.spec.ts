import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeErrorAlertComponent } from './home-error-alert.component';

describe('HomeErrorAlertComponent', () => {
    let fixture: ComponentFixture<HomeErrorAlertComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HomeErrorAlertComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(HomeErrorAlertComponent);
        fixture.componentRef.setInput('message', 'Не удалось загрузить данные.');
        fixture.componentRef.setInput('dismissing', false);
    });

    it('renders the error message and emits retry and dismiss actions', () => {
        const retrySpy = vi.fn();
        const dismissSpy = vi.fn();

        fixture.componentInstance.retry.subscribe(retrySpy);
        fixture.componentInstance.dismiss.subscribe(dismissSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent ?? '').toContain('Не удалось загрузить данные.');

        host.querySelector<HTMLElement>('[data-testid="home-error-retry"]')?.click();
        host.querySelector<HTMLElement>('[data-testid="dismiss-error"]')?.click();

        expect(retrySpy).toHaveBeenCalledOnce();
        expect(dismissSpy).toHaveBeenCalledOnce();
    });

    it('marks the alert as leaving while it is being dismissed', () => {
        fixture.componentRef.setInput('dismissing', true);
        fixture.detectChanges();

        const alert = (fixture.nativeElement as HTMLElement).querySelector('.home-alert');

        expect(alert?.classList.contains('home-alert--leaving')).toBe(true);
    });
});
