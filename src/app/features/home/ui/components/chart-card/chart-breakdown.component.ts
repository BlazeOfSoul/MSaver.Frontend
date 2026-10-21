import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    input,
    signal,
    ViewChild,
} from '@angular/core';
import { DoughnutItem } from './doughnut-breakdown';
import { formatChartValue } from './chart-card.config';
import { formatChartPercent } from './doughnut-percent-labels';

@Component({
    selector: 'ms-chart-breakdown',
    standalone: true,
    templateUrl: './chart-breakdown.component.html',
    styleUrl: './chart-breakdown.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartBreakdownComponent {
    items = input.required<readonly DoughnutItem[]>();
    slices = input.required<readonly DoughnutItem[]>();
    total = input.required<number>();
    unit = input('');
    itemLabel = input('категории');
    readonly expanded = signal(false);
    readonly query = signal('');
    readonly filteredItems = computed(() => {
        const query = this.query().trim().toLocaleLowerCase('ru');
        return this.items().filter((item) => item.label.toLocaleLowerCase('ru').includes(query));
    });
    @ViewChild('search') private search?: ElementRef<HTMLInputElement>;

    constructor() {
        effect(() => {
            this.items();
            this.query.set('');
            this.expanded.set(false);
        });
    }

    value(item: DoughnutItem): string {
        return formatChartValue(item.value, this.unit());
    }
    percent(item: DoughnutItem): string {
        return formatChartPercent(item.value, this.total());
    }
    openList(): void {
        this.expanded.set(true);
        // Focus after Angular has rendered the search input, without scrolling the page.
        setTimeout(() => this.search?.nativeElement.focus({ preventScroll: true }));
    }
}
