import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MsSelectOption } from '../../../../../shared/ui/select/select';
import { TransactionJournalComponent } from '../../components/transaction-journal/transaction-journal.component';
import { TransactionItem, TransactionPagination } from '../../home-page.models';

@Component({
    selector: 'ms-overview-tab',
    standalone: true,
    imports: [TransactionJournalComponent],
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

    editTransaction = output<TransactionItem>();
    deleteTransaction = output<string>();
    accountChange = output<string>();
    pageSizeChange = output<number>();
    pageChange = output<number>();
}
