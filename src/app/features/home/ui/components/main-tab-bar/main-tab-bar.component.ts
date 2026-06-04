import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HomeTabId, HomeTabItem } from '../../home-page.models';

@Component({
    selector: 'ms-main-tab-bar',
    standalone: true,
    templateUrl: './main-tab-bar.component.html',
    styleUrl: './main-tab-bar.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainTabBarComponent {
    tabs = input.required<ReadonlyArray<HomeTabItem>>();
    activeTab = input.required<HomeTabId>();

    tabChange = output<HomeTabId>();
}
