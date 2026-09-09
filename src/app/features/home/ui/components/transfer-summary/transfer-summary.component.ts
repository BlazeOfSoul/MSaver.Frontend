import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TransferAccountSummary } from '../../home-transfer-summary';
import { formatMoney, formatSignedMoney } from '../../home-formatters';

@Component({
    selector: 'ms-transfer-summary',
    standalone: true,
    templateUrl: './transfer-summary.component.html',
    styleUrl: './transfer-summary.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferSummaryComponent {
    items = input.required<ReadonlyArray<TransferAccountSummary>>();
    year = input.required<number>();
    readonly money = formatMoney;
    readonly signedMoney = formatSignedMoney;
    readonly groups = computed(() => {
        const currencies = [...new Set(this.items().map((item) => item.currency))];
        return currencies.map((currency) => {
            const rows = this.items().filter((item) => item.currency === currency);
            return {
                currency,
                rows,
            };
        });
    });
}
