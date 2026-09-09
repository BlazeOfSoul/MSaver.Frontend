import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartCardComponent } from '../chart-card/chart-card.component';
import { TransferAccountSummary } from '../../home-transfer-summary';
import { formatMoney, formatSignedMoney } from '../../home-formatters';

@Component({
    selector: 'ms-transfer-summary',
    standalone: true,
    imports: [ChartCardComponent],
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
                hasNetChange: rows.some((row) => row.net !== 0),
                labels: rows.map((row) => row.name),
                datasets: [
                    {
                        label: 'Изменение от переводов',
                        data: rows.map((row) => row.net),
                        color: '#67a6c1',
                        colors: rows.map((row) => (row.net < 0 ? '#ff6f91' : row.color)),
                    },
                ],
                height: Math.max(150, rows.length * 48),
            };
        });
    });
}
