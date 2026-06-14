import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
    AnalyticsCategoryMonthRow,
    AnalyticsCategoryMonthSummary,
} from '../../home-page.models';

@Component({
    selector: 'ms-analytics-month-table',
    standalone: true,
    templateUrl: './analytics-month-table.component.html',
    styleUrls: [
        './analytics-month-table.component.css',
        './analytics-month-table.part-2.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsMonthTableComponent {
    title = input.required<string>();
    rowHeader = input.required<string>();
    months = input.required<ReadonlyArray<string>>();
    rows = input.required<ReadonlyArray<AnalyticsCategoryMonthRow>>();
    summary = input<AnalyticsCategoryMonthSummary | undefined>();
    emptyText = input.required<string>();
    showWhenEmpty = input(false);
}
