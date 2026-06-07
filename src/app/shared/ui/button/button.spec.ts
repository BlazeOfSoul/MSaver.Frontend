import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
    standalone: true,
    imports: [Button],
    template: `
        <form (submit)="onSubmit($event)">
            <ms-button
                data-testid="delete-button"
                variant="danger"
                appearance="icon"
                size="sm"
                [active]="true"
                [disabled]="disabled()"
                aria-label="Delete"
                (onClick)="onDelete($event)"
            >
                <span class="material-symbols-outlined">delete</span>
            </ms-button>

            <ms-button
                data-testid="submit-button"
                type="submit"
                label="Save"
                variant="primary"
                [loading]="loading()"
                [fullWidth]="true"
            ></ms-button>
        </form>
    `,
})
class ButtonHostComponent {
    disabled = signal(false);
    loading = signal(false);
    deleteEvents: Event[] = [];
    submitEvents: Event[] = [];

    onDelete(event: Event): void {
        this.deleteEvents.push(event);
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        this.submitEvents.push(event);
    }
}

describe('Button', () => {
    let fixture: ComponentFixture<ButtonHostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ButtonHostComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ButtonHostComponent);
        fixture.detectChanges();
    });

    it('applies shared design-system classes from its public API', () => {
        const deleteButton = getByTestId('delete-button');
        const submitButton = getByTestId('submit-button');

        expect(deleteButton.classList.contains('ms-btn')).toBe(true);
        expect(deleteButton.classList.contains('ms-btn-danger')).toBe(true);
        expect(deleteButton.classList.contains('ms-btn-icon')).toBe(true);
        expect(deleteButton.classList.contains('ms-btn-sm')).toBe(true);
        expect(deleteButton.classList.contains('ms-btn-active')).toBe(true);
        expect(submitButton.classList.contains('ms-btn-full-width')).toBe(true);
    });

    it('emits clicks, blocks disabled clicks, and submits the closest form on submit buttons', () => {
        getByTestId('delete-button').click();

        expect(fixture.componentInstance.deleteEvents).toHaveLength(1);

        fixture.componentInstance.disabled.set(true);
        fixture.detectChanges();

        getByTestId('delete-button').click();

        expect(fixture.componentInstance.deleteEvents).toHaveLength(1);

        getByTestId('submit-button').click();

        expect(fixture.componentInstance.submitEvents).toHaveLength(1);
    });

    it('marks loading buttons as busy and prevents repeated actions', () => {
        fixture.componentInstance.loading.set(true);
        fixture.detectChanges();

        const submitButton = getByTestId('submit-button');

        submitButton.click();

        expect(submitButton.getAttribute('aria-busy')).toBe('true');
        expect(submitButton.classList.contains('ms-btn-loading')).toBe(true);
        expect(fixture.componentInstance.submitEvents).toHaveLength(0);
    });

    function getByTestId(testId: string): HTMLElement {
        const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
            `[data-testid="${testId}"]`,
        );

        expect(element).not.toBeNull();

        return element!;
    }
});
