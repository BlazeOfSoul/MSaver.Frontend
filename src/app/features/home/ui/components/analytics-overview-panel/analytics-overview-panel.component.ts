import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';
import { AnalyticsMetricCard } from '../../home-page.models';

export type AnalyticsViewId = 'monthly' | 'yearly' | 'tables' | 'tags';

export interface AnalyticsViewOption {
    id: AnalyticsViewId;
    label: string;
}

@Component({
    selector: 'ms-analytics-overview-panel',
    standalone: true,
    imports: [Button, SelectComponent],
    templateUrl: './analytics-overview-panel.component.html',
    styleUrls: [
        './analytics-overview-panel.component.css',
        './analytics-overview-panel.part-2.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsOverviewPanelComponent {
    metrics = input.required<ReadonlyArray<AnalyticsMetricCard>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedAccountId = input.required<string>();
    views = input.required<ReadonlyArray<AnalyticsViewOption>>();
    activeView = input.required<AnalyticsViewId>();

    accountChange = output<string>();
    viewChange = output<AnalyticsViewId>();
}
