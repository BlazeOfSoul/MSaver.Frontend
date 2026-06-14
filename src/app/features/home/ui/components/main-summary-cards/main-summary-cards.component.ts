import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HomeSummaryCard } from '../../home-page.models';

@Component({
    selector: 'ms-main-summary-cards',
    standalone: true,
    templateUrl: './main-summary-cards.component.html',
    styleUrl: './main-summary-cards.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainSummaryCardsComponent {
    cards = input.required<ReadonlyArray<HomeSummaryCard>>();
}
