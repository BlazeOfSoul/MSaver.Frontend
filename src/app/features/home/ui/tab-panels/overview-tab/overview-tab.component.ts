import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MsSelectOption } from '../../../../../shared/ui/select/select';
import { TransactionJournalComponent } from '../../components/transaction-journal/transaction-journal.component';
import {
    CategoryBreakdownItem,
    TransactionItem,
    TransactionPagination,
} from '../../home-page.models';
import { PlanningTabComponent } from '../planning-tab/planning-tab.component';

type TransactionSubtab = 'current' | 'planned';

@Component({
    selector: 'ms-overview-tab',
    standalone: true,
    imports: [TransactionJournalComponent, PlanningTabComponent],
    templateUrl: './overview-tab.component.html',
    styleUrls: ['./overview-tab.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewTabComponent {
    transactions = input.required<ReadonlyArray<TransactionItem>>();
    searchControl = input.required<FormControl<string>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedAccountId = input.required<string>();
    pageSize = input(25);
    pagination = input<TransactionPagination | null>(null);
    pageSizeOptions = input<ReadonlyArray<MsSelectOption>>([]);
    saving = input(false);
    planningMonth = input(new Date());
    planningAccountOptions = input<ReadonlyArray<MsSelectOption>>([]);
    planningExpenseCategories = input<ReadonlyArray<CategoryBreakdownItem>>([]);
    planningIncomeCategories = input<ReadonlyArray<CategoryBreakdownItem>>([]);

    editTransaction = output<TransactionItem>();
    deleteTransaction = output<string>();
    accountChange = output<string>();
    pageSizeChange = output<number>();
    pageChange = output<number>();
    transactionsChanged = output<void>();

    readonly activeSubtab = signal<TransactionSubtab>('current');

    setActiveSubtab(tab: TransactionSubtab): void {
        this.activeSubtab.set(tab);
    }

    changeSubtabFromKeyboard(event: KeyboardEvent, currentTab: TransactionSubtab): void {
        const tabs: ReadonlyArray<TransactionSubtab> = ['current', 'planned'];
        const currentIndex = tabs.indexOf(currentTab);
        let nextIndex = currentIndex;

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                nextIndex = (currentIndex + 1) % tabs.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = tabs.length - 1;
                break;
            default:
                return;
        }

        event.preventDefault();
        this.setActiveSubtab(tabs[nextIndex]);

        const tabButtons = (
            event.currentTarget as HTMLElement | null
        )?.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        tabButtons?.item(nextIndex).focus();
    }
}
