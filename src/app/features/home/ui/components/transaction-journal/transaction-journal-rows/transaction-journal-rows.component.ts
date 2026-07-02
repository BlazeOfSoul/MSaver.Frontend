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
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionJournalRowsComponent {
    transactions = input.required<ReadonlyArray<TransactionItem>>();
    saving = input(false);

    editTransaction = output<TransactionItem>();
    deleteTransaction = output<string>();

    isTransactionEditable(transaction: TransactionItem): boolean {
        return !isTransferCategory(transaction.categoryType);
    }

    canDeleteTransaction(transaction: TransactionItem): boolean {
        return this.isTransactionEditable(transaction);
    }
}

function isTransferCategory(categoryType: TransactionItem['categoryType']): boolean {
    return categoryType === 'TransferIncome' || categoryType === 'TransferExpense';
}
