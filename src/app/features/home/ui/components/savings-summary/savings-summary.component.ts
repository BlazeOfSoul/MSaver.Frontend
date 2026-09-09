import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AnalyticsStackedPoint } from '../../home-page.models';
import { formatMoney, formatSignedMoney } from '../../home-formatters';

export function incomeRemainder(income: number, expense: number) {
    const net = Math.round((income - expense) * 100) / 100;
    return { income, expense, net, rate: income > 0 ? (net / income) * 100 : NaN };
}

@Component({
    selector: 'ms-savings-summary',
    standalone: true,
    templateUrl: './savings-summary.component.html',
    styleUrl: './savings-summary.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavingsSummaryComponent {
    months = input.required<ReadonlyArray<AnalyticsStackedPoint>>();
    currency = input.required<string>();
    year = input.required<number>();
    readonly money = formatMoney;
    readonly signedMoney = formatSignedMoney;
    readonly rows = computed(() =>
        this.months()
            .filter((month) => month.income !== 0 || month.expense !== 0)
            .map((month) => ({
                label: month.label,
                ...incomeRemainder(month.income, month.expense),
            })),
    );
    readonly total = computed(() =>
        incomeRemainder(
            this.months().reduce((sum, month) => sum + month.income, 0),
            this.months().reduce((sum, month) => sum + month.expense, 0),
        ),
    );
    percent(value: number): string {
        return Number.isFinite(value)
            ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value) + '%'
            : '—';
    }
}
