import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TransactionItem } from '../../home-page.models';

@Component({
    selector: 'ms-overview-tab',
    standalone: true,
    templateUrl: './overview-tab.component.html',
    styleUrl: './overview-tab.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewTabComponent {
    transactions = input.required<ReadonlyArray<TransactionItem>>();
}
