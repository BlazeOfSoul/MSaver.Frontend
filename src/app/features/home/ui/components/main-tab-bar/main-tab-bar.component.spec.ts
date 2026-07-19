import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeTabId, HomeTabItem } from '../../home-page.models';
import { MainTabBarComponent } from './main-tab-bar.component';

@Component({
    standalone: true,
    imports: [MainTabBarComponent],
    template: `
        <ms-main-tab-bar
            [tabs]="tabs"
            [activeTab]="activeTab()"
            (tabChange)="activeTab.set($event)"
        ></ms-main-tab-bar>
    `,
})
class HostComponent {
    readonly tabs: ReadonlyArray<HomeTabItem> = [
        { id: 'overview', label: 'Overview', icon: 'home' },
        { id: 'accounts', label: 'Accounts', icon: 'account_balance_wallet' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        { id: 'categories', label: 'Categories', icon: 'category' },
    ];
    readonly activeTab = signal<HomeTabId>('overview');
}

describe('MainTabBarComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
    });

    it.each([
        ['ArrowRight', 'accounts'],
        ['ArrowDown', 'accounts'],
        ['ArrowLeft', 'categories'],
        ['ArrowUp', 'categories'],
    ] as const)('moves focus with %s and wraps when needed', (key, expectedTab) => {
        const firstTab = tab('overview');
        firstTab.focus();

        firstTab.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        fixture.detectChanges();

        expect(fixture.componentInstance.activeTab()).toBe(expectedTab);
        expect(document.activeElement).toBe(tab(expectedTab));
        expect(tab(expectedTab).getAttribute('tabindex')).toBe('0');
    });

    it.each([
        ['Home', 'overview'],
        ['End', 'categories'],
    ] as const)('moves focus with %s to the tab-list boundary', (key, expectedTab) => {
        fixture.componentInstance.activeTab.set('analytics');
        fixture.detectChanges();
        const currentTab = tab('analytics');
        currentTab.focus();

        currentTab.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        fixture.detectChanges();

        expect(fixture.componentInstance.activeTab()).toBe(expectedTab);
        expect(document.activeElement).toBe(tab(expectedTab));
    });

    function tab(id: HomeTabId): HTMLElement {
        const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
            `#home-tab-${id}`,
        );

        expect(element).not.toBeNull();
        return element!;
    }
});
