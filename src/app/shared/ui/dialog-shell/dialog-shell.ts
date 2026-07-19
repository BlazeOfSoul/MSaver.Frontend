import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    inject,
    input,
    OnDestroy,
    output,
    viewChild,
} from '@angular/core';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

@Component({
    selector: 'ms-dialog-shell',
    standalone: true,
    template: `
        <div
            #backdrop
            [attr.class]="backdropClass()"
            tabindex="-1"
            (pointerdown)="onBackdropPointerDown($event)"
            (click)="onBackdropClick($event)"
            (keydown)="onBackdropKeydown($event)"
        >
            <ng-content></ng-content>
        </div>
    `,
    styleUrl: './dialog-shell.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogShellComponent implements AfterViewInit, OnDestroy {
    private readonly document = inject(DOCUMENT);
    private readonly backdrop = viewChild.required<ElementRef<HTMLElement>>('backdrop');

    backdropClass = input('dialog-backdrop');

    closed = output<void>();

    private pointerDownStartedOnBackdrop = false;
    private previouslyFocusedElement: HTMLElement | null = null;
    private destroyed = false;

    ngAfterViewInit(): void {
        this.previouslyFocusedElement = this.asFocusableElement(this.document.activeElement);

        queueMicrotask(() => {
            if (!this.destroyed) {
                this.focusInitialElement();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        const elementToRestore = this.previouslyFocusedElement;

        queueMicrotask(() => {
            if (elementToRestore?.isConnected) {
                elementToRestore.focus();
            }
        });
    }

    onBackdropPointerDown(event: PointerEvent): void {
        this.pointerDownStartedOnBackdrop = event.target === event.currentTarget;
    }

    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget && this.pointerDownStartedOnBackdrop) {
            this.closed.emit();
        }

        this.pointerDownStartedOnBackdrop = false;
    }

    onBackdropKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.closed.emit();
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const focusableElements = this.getFocusableElements();
        if (!focusableElements.length) {
            event.preventDefault();
            this.focusDialogFallback();
            return;
        }

        const activeElement = this.asFocusableElement(this.document.activeElement);
        const activeIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (activeIndex === -1 || (event.shiftKey && activeElement === firstElement)) {
            event.preventDefault();
            (event.shiftKey ? lastElement : firstElement).focus();
            return;
        }

        if (!event.shiftKey && activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }

    private focusInitialElement(): void {
        const focusableElements = this.getFocusableElements();
        const autofocusElement = focusableElements.find((element) =>
            element.hasAttribute('autofocus'),
        );

        if (autofocusElement) {
            autofocusElement.focus();
            return;
        }

        if (focusableElements[0]) {
            focusableElements[0].focus();
            return;
        }

        this.focusDialogFallback();
    }

    private focusDialogFallback(): void {
        const backdrop = this.backdrop().nativeElement;
        const dialog = backdrop.querySelector<HTMLElement>('[role="dialog"]');

        if (dialog && this.isAvailable(dialog)) {
            if (!dialog.hasAttribute('tabindex')) {
                dialog.setAttribute('tabindex', '-1');
            }
            dialog.focus();
            return;
        }

        backdrop.focus();
    }

    private getFocusableElements(): HTMLElement[] {
        return Array.from(
            this.backdrop().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter(
            (element) =>
                element.tabIndex >= 0 &&
                element.getAttribute('aria-disabled') !== 'true' &&
                this.isAvailable(element),
        );
    }

    private isAvailable(element: HTMLElement): boolean {
        if (element.closest('[hidden], [inert], [aria-hidden="true"]')) {
            return false;
        }

        const style = this.document.defaultView?.getComputedStyle(element);
        return style?.display !== 'none' && style?.visibility !== 'hidden';
    }

    private asFocusableElement(element: Element | null): HTMLElement | null {
        if (element && typeof (element as HTMLElement).focus === 'function') {
            return element as HTMLElement;
        }

        return null;
    }
}
