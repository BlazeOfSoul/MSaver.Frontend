import { TestBed } from '@angular/core/testing';
import { AccountOrderPanelComponent } from './account-order-panel.component';
import { AccountBalanceItem } from '../../home-page.models';

describe('AccountOrderPanelComponent', () => {
    function setup() {
        const fixture = TestBed.createComponent(AccountOrderPanelComponent);
        fixture.componentRef.setInput(
            'accounts',
            ['a', 'b', 'c'].map(
                (id) =>
                    ({ id, name: id, color: '#23c78b', currencyCode: 'BYN' }) as AccountBalanceItem,
            ),
        );
        fixture.detectChanges();
        const emit = vi.spyOn(fixture.componentInstance.reorder, 'emit');
        return { fixture, component: fixture.componentInstance, emit };
    }

    it('emits the full order on drag and announces the new position', () => {
        const { component, emit } = setup();
        component.drop({ previousIndex: 0, currentIndex: 2 });
        expect(emit).toHaveBeenCalledWith(['b', 'c', 'a']);
        expect(component.announcement()).toContain('3 из 3');
    });

    it('supports arrows and Home/End through the visible handle', () => {
        const { fixture, emit } = setup();
        const handles = fixture.nativeElement.querySelectorAll(
            '.order-handle',
        ) as NodeListOf<HTMLButtonElement>;
        handles[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(emit).toHaveBeenLastCalledWith(['b', 'a', 'c']);
        handles[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(emit).toHaveBeenLastCalledWith(['b', 'c', 'a']);
    });

    it('blocks dragging and keyboard changes while a save is in flight', () => {
        const { fixture, component, emit } = setup();
        fixture.componentRef.setInput('saving', true);
        fixture.detectChanges();
        component.drop({ previousIndex: 0, currentIndex: 1 });
        component.keyboard(new KeyboardEvent('keydown', { key: 'ArrowDown' }), 0);
        expect(emit).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('.order-handle').disabled).toBe(true);
    });

    it('ignores drops outside the list and unchanged positions', () => {
        const { component, emit } = setup();
        component.drop({ previousIndex: 0, currentIndex: 0 });
        component.drop({ previousIndex: 0, currentIndex: 9 });
        expect(emit).not.toHaveBeenCalled();
    });
});
