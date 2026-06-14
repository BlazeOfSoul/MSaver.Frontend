import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagGroupItem } from '../../home-page.models';
import { TagGroupCardComponent } from './tag-group-card.component';

const group: TagGroupItem = {
    id: 'home-tag',
    name: 'Home',
    color: '#67a6c1',
    categories: [
        {
            id: 'internet-id',
            name: 'Internet',
            color: '#c77dff',
            type: 'expense',
        },
    ],
};

describe('TagGroupCardComponent', () => {
    let fixture: ComponentFixture<TagGroupCardComponent>;
    let component: TagGroupCardComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TagGroupCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TagGroupCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('group', group);
        fixture.componentRef.setInput('availableCategoryOptions', [
            { value: 'rent-id', label: 'Rent' },
        ]);
        fixture.componentRef.setInput('saving', false);
    });

    it('renders the tag color, title and assigned categories', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const card = host.querySelector<HTMLElement>('.tag-group-card');
        const category = host.querySelector<HTMLElement>('.tag-category-pill');

        expect(card?.style.getPropertyValue('--tag-color')).toBe('#67a6c1');
        expect(host.textContent).toContain('# Home');
        expect(host.textContent).toContain('Категории в теге · 1');
        expect(category?.style.getPropertyValue('--category-color')).toBe('#c77dff');
        expect(category?.textContent).toContain('Internet');
    });

    it('emits tag and category actions and ignores empty category selections', () => {
        const deleteTagSpy = vi.fn();
        const assignSpy = vi.fn();
        const removeSpy = vi.fn();
        component.deleteTag.subscribe(deleteTagSpy);
        component.assignCategoryToTag.subscribe(assignSpy);
        component.removeCategoryFromTag.subscribe(removeSpy);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('[data-testid="delete-tag"]')?.click();
        component.onAssignCategory('');
        component.onAssignCategory('rent-id');
        host.querySelector<HTMLButtonElement>('[data-testid="remove-tag-category"]')?.click();

        expect(deleteTagSpy).toHaveBeenCalledWith('home-tag');
        expect(assignSpy).toHaveBeenCalledOnce();
        expect(assignSpy).toHaveBeenCalledWith({ tagId: 'home-tag', categoryId: 'rent-id' });
        expect(removeSpy).toHaveBeenCalledWith({
            tagId: 'home-tag',
            categoryId: 'internet-id',
        });
    });

    it('renders empty states when no options or categories are available', () => {
        fixture.componentRef.setInput('group', { ...group, categories: [] });
        fixture.componentRef.setInput('availableCategoryOptions', []);

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent).toContain('Все доступные категории уже в этом теге.');
        expect(host.textContent).toContain('В этом теге пока нет категорий.');
    });
});
