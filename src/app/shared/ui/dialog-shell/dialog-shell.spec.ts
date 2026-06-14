import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogShellComponent } from './dialog-shell';

@Component({
    standalone: true,
    imports: [DialogShellComponent],
    template: `
        <ms-dialog-shell backdropClass="test-backdrop" (closed)="closeCount = closeCount + 1">
            <section class="test-dialog">Dialog body</section>
        </ms-dialog-shell>
    `,
})
class HostComponent {
    closeCount = 0;
}

describe('DialogShellComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
    });

    it('keeps the dialog open when pointer starts inside and click ends on the backdrop', () => {
        const host = fixture.nativeElement as HTMLElement;
        const backdrop = host.querySelector<HTMLElement>('.test-backdrop');
        const dialog = host.querySelector<HTMLElement>('.test-dialog');

        expect(backdrop).not.toBeNull();
        expect(dialog).not.toBeNull();

        dialog!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(fixture.componentInstance.closeCount).toBe(0);
    });

    it('emits close when the pointer starts and ends on the backdrop', () => {
        const host = fixture.nativeElement as HTMLElement;
        const backdrop = host.querySelector<HTMLElement>('.test-backdrop');

        expect(backdrop).not.toBeNull();

        backdrop!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(fixture.componentInstance.closeCount).toBe(1);
    });
});
