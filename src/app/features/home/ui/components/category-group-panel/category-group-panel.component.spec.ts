import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryBreakdownItem } from '../../home-page.models';
import { CategoryGroupPanelComponent } from './category-group-panel.component';

function category(overrides: Partial<CategoryBreakdownItem>): CategoryBreakdownItem {
    return {
        id: 'category-id',
        name: 'Category',
        amount: '0.00 Br',
        amountValue: 0,
        progress: 0,
        color: '#23c78b',
        type: 'income',
        tone: 'good',
        isSystem: false,
        ...overrides,
    };
}

describe('CategoryGroupPanelComponent', () => {
    let fixture: ComponentFixture<CategoryGroupPanelComponent>;
    let component: CategoryGroupPanelComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CategoryGroupPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CategoryGroupPanelComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('title', 'Income');
        fixture.componentRef.setInput('description', 'Income categories');
        fixture.componentRef.setInput('addButtonTestId', 'open-income-category-dialog');
        fixture.componentRef.setInput('addButtonAriaLabel', 'Add income category');
        fixture.componentRef.setInput('railAriaLabel', 'Income categories');
        fixture.componentRef.setInput('emptyText', 'No income categories.');
        fixture.componentRef.setInput('categories', [
            category({ id: 'salary-id', name: 'Salary', color: '#23c78b', isSystem: false }),
            category({ id: 'debt-id', name: 'Debt', color: '#ff6f91', isSystem: true }),
        ]);
        fixture.componentRef.setInput('saving', false);
    });

    it('renders category chips and hides delete actions for system categories', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const rail = host.querySelector<HTMLElement>('.category-rail');
        const chips = Array.from(host.querySelectorAll<HTMLElement>('.category-chip'));
        const salaryChip = chips.find((chip) => chip.textContent?.includes('Salary'));
        const debtChip = chips.find((chip) => chip.textContent?.includes('Debt'));

        expect(host.querySelector('h2')?.textContent).toContain('Income');
        expect(host.querySelector('.panel__header p')?.textContent).toContain('Income categories');
        expect(rail?.getAttribute('aria-label')).toBe('Income categories');
        expect(salaryChip?.style.getPropertyValue('--category-color')).toBe('#23c78b');
        expect(salaryChip?.querySelector('.category-chip__action')).not.toBeNull();
        expect(debtChip?.querySelector('.category-chip__action')).toBeNull();
        expect(host.textContent).not.toContain('0.00 Br');
    });

    it('emits add and delete events', () => {
        const addSpy = vi.fn();
        const deleteSpy = vi.fn();
        component.add.subscribe(addSpy);
        component.deleteCategory.subscribe(deleteSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>(
            '[data-testid="open-income-category-dialog"]',
        )?.click();
        host.querySelector<HTMLButtonElement>('.category-chip__action')?.click();

        expect(addSpy).toHaveBeenCalledOnce();
        expect(deleteSpy).toHaveBeenCalledWith('salary-id');
    });

    it('emits priority move actions for non-system categories only', () => {
        const moveSpy = vi.fn();
        component.moveCategory.subscribe(moveSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const moveButtons = host.querySelectorAll<HTMLButtonElement>('.category-chip__move');

        expect(moveButtons).toHaveLength(2);
        expect(moveButtons[0].disabled).toBe(true);
        expect(moveButtons[1].disabled).toBe(false);

        moveButtons[1].click();

        expect(moveSpy).toHaveBeenCalledWith({ categoryId: 'salary-id', direction: 'down' });
    });

    it('uses the provided move availability callback for chip controls', () => {
        fixture.componentRef.setInput('categories', [
            category({ id: 'salary-id', name: 'Salary', isSystem: false }),
        ]);
        fixture.componentRef.setInput('canMoveCategory', (
            _category: CategoryBreakdownItem,
            direction: 'up' | 'down',
        ) => direction === 'up');

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const moveButtons = host.querySelectorAll<HTMLButtonElement>('.category-chip__move');

        expect(moveButtons).toHaveLength(2);
        expect(moveButtons[0].disabled).toBe(false);
        expect(moveButtons[1].disabled).toBe(true);
    });

    it('renders the empty state when there are no categories', () => {
        fixture.componentRef.setInput('categories', []);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.category-rail')).toBeNull();
        expect(host.textContent).toContain('No income categories.');
    });
});
