import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'ms-dialog-shell',
    standalone: true,
    template: `
        <div
            [attr.class]="backdropClass()"
            (pointerdown)="onBackdropPointerDown($event)"
            (click)="onBackdropClick($event)"
        >
            <ng-content></ng-content>
        </div>
    `,
    styleUrl: './dialog-shell.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogShellComponent {
    backdropClass = input('dialog-backdrop');

    closed = output<void>();

    private pointerDownStartedOnBackdrop = false;

    onBackdropPointerDown(event: PointerEvent): void {
        this.pointerDownStartedOnBackdrop = event.target === event.currentTarget;
    }

    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget && this.pointerDownStartedOnBackdrop) {
            this.closed.emit();
        }

        this.pointerDownStartedOnBackdrop = false;
    }
}
