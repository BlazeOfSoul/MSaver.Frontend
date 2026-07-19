import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    inject,
    input,
    output,
} from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { HomeTabId, HomeTabItem } from '../../home-page.models';

@Component({
    selector: 'ms-main-tab-bar',
    standalone: true,
    imports: [Button],
    templateUrl: './main-tab-bar.component.html',
    styleUrl: './main-tab-bar.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainTabBarComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    tabs = input.required<ReadonlyArray<HomeTabItem>>();
    activeTab = input.required<HomeTabId>();

    tabChange = output<HomeTabId>();

    onTabKeydown(event: KeyboardEvent, currentIndex: number): void {
        const tabs = this.tabs();
        if (!tabs.length) {
            return;
        }

        let nextIndex: number;

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                nextIndex = (currentIndex + 1) % tabs.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = tabs.length - 1;
                break;
            default:
                return;
        }

        event.preventDefault();

        const nextTab = tabs[nextIndex];
        this.tabChange.emit(nextTab.id);
        this.host.nativeElement.querySelector<HTMLElement>(`#home-tab-${nextTab.id}`)?.focus();
    }
}
