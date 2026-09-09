import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from '../../../../../shared/ui/button/button';
import { DialogShellComponent } from '../../../../../shared/ui/dialog-shell/dialog-shell';
import { calculateOutstandingDebt, DebtCategoryKind } from '../../home-debt.utils';
import { formatMoney } from '../../home-formatters';

export interface DebtDetailItem {
    id: string;
    date: string;
    month: string;
    account: string;
    category: string;
    description: string;
    kind: DebtCategoryKind;
    amount: number;
    amountLabel: string;
}
export interface DebtDetailSelection {
    rowId: string;
    monthIndex: number;
}

@Component({
    selector: 'ms-debt-details',
    standalone: true,
    imports: [Button, DialogShellComponent, DatePipe],
    templateUrl: './debt-details.component.html',
    styleUrl: './debt-details.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebtDetailsComponent {
    items = input.required<ReadonlyArray<DebtDetailItem>>();
    selection = input.required<DebtDetailSelection>();
    year = input.required<number>();
    currency = input.required<string>();
    closed = output<void>();
    readonly title = computed(() =>
        this.selection().rowId === 'owed-to-me' ? 'Мне должны' : 'Я должен',
    );
    readonly increaseKind = computed(() =>
        this.selection().rowId === 'owed-to-me' ? 'given' : 'taken',
    );
    readonly decreaseKind = computed(() =>
        this.selection().rowId === 'owed-to-me' ? 'received' : 'returned',
    );
    readonly until = computed(
        () => this.year() + '-' + String(this.selection().monthIndex + 1).padStart(2, '0'),
    );
    readonly visibleItems = computed(() =>
        this.items()
            .filter(
                (item) =>
                    item.month <= this.until() &&
                    (item.kind === this.increaseKind() || item.kind === this.decreaseKind()),
            )
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date)),
    );
    readonly increased = computed(() =>
        this.visibleItems()
            .filter((item) => item.kind === this.increaseKind())
            .reduce((sum, item) => sum + item.amount, 0),
    );
    readonly decreased = computed(() =>
        this.visibleItems()
            .filter((item) => item.kind === this.decreaseKind())
            .reduce((sum, item) => sum + item.amount, 0),
    );
    readonly balance = computed(() => calculateOutstandingDebt(this.increased(), this.decreased()));
    money(value: number): string {
        return formatMoney(value, this.currency());
    }
}
