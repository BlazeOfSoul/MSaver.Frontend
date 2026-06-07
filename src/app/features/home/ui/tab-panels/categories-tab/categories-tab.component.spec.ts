import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { CategoryBreakdownItem, TagGroupItem } from '../../home-page.models';
import { CategoriesTabComponent } from './categories-tab.component';

function category(overrides: Partial<CategoryBreakdownItem>): CategoryBreakdownItem {
    return {
        id: 'category-id',
        name: 'Категория',
        amount: '0,00 Br',
        amountValue: 0,
        progress: 0,
        color: '#23c78b',
        type: 'income',
        tone: 'good',
        isSystem: false,
        ...overrides,
    };
}

describe('CategoriesTabComponent', () => {
    let fixture: ComponentFixture<CategoriesTabComponent>;
    let component: CategoriesTabComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CategoriesTabComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CategoriesTabComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('incomeCategories', []);
        fixture.componentRef.setInput('expenseCategories', []);
        fixture.componentRef.setInput('tagGroups', []);
        fixture.componentRef.setInput('newIncomeCategory', '');
        fixture.componentRef.setInput('newExpenseCategory', '');
        fixture.componentRef.setInput('newTagGroup', '');
        fixture.componentRef.setInput('newIncomeCategoryColor', '#23c78b');
        fixture.componentRef.setInput('newExpenseCategoryColor', '#ff6f91');
        fixture.componentRef.setInput('categoryOptions', []);
        fixture.componentRef.setInput('searchControl', new FormControl('', { nonNullable: true }));
        fixture.componentRef.setInput('saving', false);
    });

    it('uses saved category colors in category and tag rails', () => {
        const tags: TagGroupItem[] = [
            {
                id: 'tag-id',
                name: 'Дом',
                color: '#67a6c1',
                categories: [
                    {
                        id: 'nested-id',
                        name: 'Интернет',
                        color: '#c77dff',
                        type: 'expense',
                    },
                ],
            },
        ];

        fixture.componentRef.setInput('incomeCategories', [
            category({ id: 'salary-id', name: 'Зарплата', color: '#23c78b', type: 'income' }),
        ]);
        fixture.componentRef.setInput('expenseCategories', [
            category({ id: 'food-id', name: 'Продукты', color: '#ff6f91', type: 'expense' }),
        ]);
        fixture.componentRef.setInput('tagGroups', tags);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const rails = host.querySelectorAll('.category-rail');
        const chips = Array.from(host.querySelectorAll<HTMLElement>('.category-chip'));
        const salaryChip = chips.find((chip) => chip.textContent?.includes('Зарплата'));
        const foodChip = chips.find((chip) => chip.textContent?.includes('Продукты'));
        const nestedChip = host.querySelector<HTMLElement>('.tag-category-pill');

        expect(rails.length).toBeGreaterThanOrEqual(2);
        expect(salaryChip?.style.getPropertyValue('--category-color')).toBe('#23c78b');
        expect(foodChip?.style.getPropertyValue('--category-color')).toBe('#ff6f91');
        expect(nestedChip?.style.getPropertyValue('--category-color')).toBe('#c77dff');
        expect(nestedChip?.textContent).toContain('Интернет');
        expect(host.textContent).toContain('Категории в теге · 1');
        expect(salaryChip?.textContent).not.toContain('0,00 Br');
        expect(foodChip?.textContent).not.toContain('0,00 Br');
    });

    it('emits selected color when creating a category', () => {
        const emitSpy = vi.fn();
        component.newIncomeCategoryColorChange.subscribe(emitSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        host.querySelector<HTMLButtonElement>('[data-testid="open-income-category-dialog"]')?.click();
        fixture.detectChanges();

        const colorPicker = host.querySelector<HTMLInputElement>(
            '[data-testid="income-color-picker"]',
        );

        expect(colorPicker).not.toBeNull();

        colorPicker!.value = '#67a6c1';
        colorPicker!.dispatchEvent(new Event('input'));

        expect(emitSpy).toHaveBeenCalledWith('#67a6c1');
    });

    it('creates categories from a modal dialog', () => {
        const addSpy = vi.fn();
        const nameSpy = vi.fn();
        component.addIncomeCategory.subscribe(addSpy);
        component.newIncomeCategoryChange.subscribe(nameSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.create-form')).toBeNull();

        host.querySelector<HTMLButtonElement>('[data-testid="open-income-category-dialog"]')?.click();
        fixture.detectChanges();

        const dialog = host.querySelector<HTMLElement>('.category-dialog');
        const input = dialog?.querySelector<HTMLInputElement>('input');

        expect(dialog).not.toBeNull();
        expect(dialog?.textContent ?? '').toContain('Новая категория доходов');

        input!.value = 'Премия';
        input!.dispatchEvent(new Event('input'));
        fixture.componentRef.setInput('newIncomeCategory', 'Премия');
        fixture.detectChanges();

        host.querySelector<HTMLButtonElement>('[data-testid="submit-category-dialog"]')?.click();

        expect(nameSpy).toHaveBeenCalledWith('Премия');
        expect(addSpy).toHaveBeenCalledOnce();
    });

    it('does not render delete actions for system categories', () => {
        fixture.componentRef.setInput('incomeCategories', [
            category({ id: 'salary-id', name: 'Зарплата', isSystem: false }),
            category({ id: 'debt-id', name: 'Взято в долг (+)', isSystem: true }),
        ]);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const salaryChip = Array.from(host.querySelectorAll<HTMLElement>('.category-chip')).find(
            (chip) => chip.textContent?.includes('Зарплата'),
        );
        const debtChip = Array.from(host.querySelectorAll<HTMLElement>('.category-chip')).find(
            (chip) => chip.textContent?.includes('Взято в долг (+)'),
        );

        expect(salaryChip?.querySelector('.category-chip__action')).not.toBeNull();
        expect(debtChip?.querySelector('.category-chip__action')).toBeNull();
    });

    it('filters out categories already assigned to a tag', () => {
        fixture.componentRef.setInput('categoryOptions', [
            { value: 'food-id', label: 'Food' },
            { value: 'rent-id', label: 'Rent' },
        ]);

        const options = component.categoryOptionsForTag({
            id: 'tag-id',
            name: 'Home',
            color: '#67a6c1',
            categories: [{ id: 'food-id', name: 'Food', color: '#ff6f91', type: 'expense' }],
        });

        expect(options).toEqual([{ value: 'rent-id', label: 'Rent' }]);
    });

    it('emits selected category for a tag and ignores empty selections', () => {
        const emitSpy = vi.fn();
        component.assignCategoryToTag.subscribe(emitSpy);

        component.onAssignCategoryToTag('tag-id', '');
        component.onAssignCategoryToTag('tag-id', 'rent-id');

        expect(emitSpy).toHaveBeenCalledTimes(1);
        expect(emitSpy).toHaveBeenCalledWith({ tagId: 'tag-id', categoryId: 'rent-id' });
    });
});
