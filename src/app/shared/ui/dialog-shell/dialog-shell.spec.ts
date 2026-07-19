import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogShellComponent } from './dialog-shell';

@Component({
    standalone: true,
    imports: [DialogShellComponent],
    template: `
        <button class="trigger" type="button">Open dialog</button>
        @if (open()) {
            <ms-dialog-shell backdropClass="test-backdrop" (closed)="closeDialog()">
                <section class="test-dialog" role="dialog" aria-modal="true">
                    <button class="first-action" type="button" autofocus>First action</button>
                    <button class="last-action" type="button">Last action</button>
                </section>
            </ms-dialog-shell>
        }
    `,
})
class HostComponent {
    readonly open = signal(true);
    closeCount = 0;

    closeDialog(): void {
        this.closeCount += 1;
        this.open.set(false);
    }
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

    it('moves initial focus into the dialog and traps Tab at both boundaries', async () => {
        await fixture.whenStable();
        const host = fixture.nativeElement as HTMLElement;
        const firstAction = host.querySelector<HTMLElement>('.first-action');
        const lastAction = host.querySelector<HTMLElement>('.last-action');

        expect(document.activeElement).toBe(firstAction);

        lastAction!.focus();
        lastAction!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        expect(document.activeElement).toBe(firstAction);

        firstAction!.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
        );
        expect(document.activeElement).toBe(lastAction);
    });

    it('closes on Escape and restores focus to the previously focused element', async () => {
        fixture.componentInstance.open.set(false);
        fixture.detectChanges();
        await fixture.whenStable();

        const host = fixture.nativeElement as HTMLElement;
        const trigger = host.querySelector<HTMLElement>('.trigger');
        trigger!.focus();
        fixture.componentInstance.open.set(true);
        fixture.detectChanges();
        await fixture.whenStable();

        const firstAction = host.querySelector<HTMLElement>('.first-action');
        expect(document.activeElement).toBe(firstAction);

        const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true,
        });
        firstAction!.dispatchEvent(escapeEvent);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(escapeEvent.defaultPrevented).toBe(true);
        expect(fixture.componentInstance.closeCount).toBe(1);
        expect(document.activeElement).toBe(trigger);
    });
});
