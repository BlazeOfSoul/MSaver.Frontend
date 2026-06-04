import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Surface } from './surface';

@Component({
    standalone: true,
    imports: [Surface],
    template: `
        <ms-surface variant="tile" [interactive]="true">
            <span>Projected content</span>
        </ms-surface>
    `,
})
class SurfaceHostComponent {}

describe('Surface', () => {
    let fixture: ComponentFixture<SurfaceHostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SurfaceHostComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SurfaceHostComponent);
        fixture.detectChanges();
    });

    it('projects content and applies design-system classes', () => {
        const surface = (fixture.nativeElement as HTMLElement).querySelector('ms-surface');
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(surface).not.toBeNull();
        expect(surface?.classList.contains('ms-surface')).toBe(true);
        expect(surface?.classList.contains('ms-surface-tile')).toBe(true);
        expect(surface?.classList.contains('ms-surface-interactive')).toBe(true);
        expect(text).toContain('Projected content');
    });
});
