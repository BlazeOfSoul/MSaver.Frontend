import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainHeaderComponent } from './main-header.component';

describe('MainHeaderComponent', () => {
    let fixture: ComponentFixture<MainHeaderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MainHeaderComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(MainHeaderComponent);
        fixture.componentRef.setInput('monthLabel', 'June 2026');
        fixture.componentRef.setInput('userName', 'Alex');
    });

    it('uses colored variants for settings and logout actions', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const settingsButton = host.querySelector<HTMLElement>('[data-testid="settings-button"]');
        const logoutButton = host.querySelector<HTMLElement>('[data-testid="logout-button"]');

        expect(settingsButton?.classList.contains('ms-btn-primary')).toBe(true);
        expect(logoutButton?.classList.contains('ms-btn-danger')).toBe(true);
    });

    it('marks the logout label so the mobile header can collapse it to an icon button', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const logoutButton = host.querySelector<HTMLElement>('[data-testid="logout-button"]');

        expect(logoutButton?.querySelector('.logout-button__label')).not.toBeNull();
        expect(logoutButton?.getAttribute('aria-label')).toBeTruthy();
    });
});
