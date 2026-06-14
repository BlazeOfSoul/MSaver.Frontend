import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
import { NameColorDialogComponent } from './name-color-dialog.component';

describe('NameColorDialogComponent', () => {
    let fixture: ComponentFixture<NameColorDialogComponent>;
    let component: NameColorDialogComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NameColorDialogComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(NameColorDialogComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('title', 'Новая категория доходов');
        fixture.componentRef.setInput('description', 'Выберите понятное вам название и цвет.');
        fixture.componentRef.setInput('placeholder', 'Например: Продукты');
        fixture.componentRef.setInput('name', 'Продукты');
        fixture.componentRef.setInput('color', '#23c78b');
        fixture.componentRef.setInput('fallbackName', 'Новая категория');
        fixture.componentRef.setInput('previewKind', 'category');
        fixture.componentRef.setInput('colorPickerTestId', 'category-color-picker');
        fixture.componentRef.setInput('submitTestId', 'submit-category-dialog');
        fixture.componentRef.setInput('saving', false);
    });

    it('renders a category preview and emits name, color and submit events', () => {
        const nameSpy = vi.fn();
        const colorSpy = vi.fn();
        const submitSpy = vi.fn();
        component.nameChange.subscribe(nameSpy);
        component.colorChange.subscribe(colorSpy);
        component.submit.subscribe(submitSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const input = host.querySelector<HTMLInputElement>('input[type="text"]');
        const colorInput = host.querySelector<HTMLInputElement>(
            '[data-testid="category-color-picker"]',
        );
        const preview = host.querySelector<HTMLElement>('.category-chip--preview');

        expect(host.querySelector('.category-dialog')?.classList.contains('tag-dialog')).toBe(
            false,
        );
        expect(host.textContent).toContain('Новая категория доходов');
        expect(preview?.style.getPropertyValue('--category-color')).toBe('#23c78b');
        expect(preview?.textContent).toContain('Продукты');

        input!.value = 'Премия';
        input!.dispatchEvent(new Event('input'));
        colorInput!.value = '#67a6c1';
        colorInput!.dispatchEvent(new Event('input'));
        host.querySelector<HTMLButtonElement>('[data-testid="submit-category-dialog"]')?.click();

        expect(nameSpy).toHaveBeenCalledWith('Премия');
        expect(colorSpy).toHaveBeenCalledWith('#67a6c1');
        expect(submitSpy).toHaveBeenCalledOnce();
    });

    it('renders a tag preview and blocks blank submit', () => {
        const submitSpy = vi.fn();
        component.submit.subscribe(submitSpy);
        fixture.componentRef.setInput('title', 'Новый тег');
        fixture.componentRef.setInput('name', '');
        fixture.componentRef.setInput('color', '#67a6c1');
        fixture.componentRef.setInput('fallbackName', 'Новый тег');
        fixture.componentRef.setInput('previewKind', 'tag');
        fixture.componentRef.setInput('colorPickerTestId', 'tag-color-picker');
        fixture.componentRef.setInput('submitTestId', 'submit-tag-dialog');

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const preview = host.querySelector<HTMLElement>('.tag-preview');
        const submitButton = host.querySelector<HTMLElement>('[data-testid="submit-tag-dialog"]');

        expect(host.querySelector('.category-dialog')?.classList.contains('tag-dialog')).toBe(true);
        expect(preview?.style.getPropertyValue('--tag-color')).toBe('#67a6c1');
        expect(preview?.textContent).toContain('# Новый тег');
        expect(submitButton?.classList.contains('ms-btn-disabled')).toBe(true);

        submitButton?.click();

        expect(submitSpy).not.toHaveBeenCalled();
    });

    it('ignores color values from events that do not originate from color inputs', () => {
        const event = new Event('input', { bubbles: true });
        const target = document.createElement('div');
        Object.defineProperty(target, 'value', { value: '#000000' });
        Object.defineProperty(event, 'target', { value: target });

        expect(component.readColor(event)).toBe(MS_CATEGORY_COLORS[0]);
    });

    it('emits closed only for backdrop clicks that start on the backdrop', () => {
        const closedSpy = vi.fn();
        component.closed.subscribe(closedSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const backdrop = host.querySelector<HTMLElement>('.category-dialog-backdrop');
        const dialog = host.querySelector<HTMLElement>('.category-dialog');

        dialog!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        backdrop!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(closedSpy).toHaveBeenCalledOnce();
    });
});
