import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../../shared/ui/button/button';
import { TransactionItem } from '../../../home-page.models';

@Component({
    selector: 'tbody[ms-transaction-journal-rows]',
    standalone: true,
    imports: [Button],
    templateUrl: './transaction-journal-rows.component.html',
    styleUrls: [
        './transaction-journal-rows.component.css',
        './transaction-journal-rows.part-2.css',
        './transaction-journal-rows.part-3.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionJournalRowsComponent {
    transactions = input.required<ReadonlyArray<TransactionItem>>();
    expandedTransactionId = input<string | null>(null);
    saving = input(false);

    toggleDetails = output<string>();
    editTransaction = output<TransactionItem>();
    deleteTransaction = output<string>();

    isTransactionExpanded(transactionId: string): boolean {
        return this.expandedTransactionId() === transactionId;
    }

    isTransactionEditable(transaction: TransactionItem): boolean {
        return transaction.categoryType === 'Credit' || transaction.categoryType === 'Debit';
    }

    canDeleteTransaction(transaction: TransactionItem): boolean {
        return this.isTransactionEditable(transaction);
    }
}
