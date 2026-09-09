import { TransactionResponse } from '../data-access/home-api.models';
import { AccountBalanceItem } from './home-page.models';

export interface TransferAccountSummary {
    id: string;
    name: string;
    currency: string;
    color: string;
    incoming: number;
    outgoing: number;
    net: number;
}

/** Keep each account in its native currency: exchange-rate changes are not transfers. */
export function summarizeAccountTransfers(
    transactions: ReadonlyArray<TransactionResponse>,
    accounts: ReadonlyArray<AccountBalanceItem>,
): TransferAccountSummary[] {
    const byId = new Map(accounts.map((account) => [account.id, account]));
    const totals = new Map<string, TransferAccountSummary>();
    for (const transaction of transactions) {
        const type = transaction.category.type;
        if (type !== 'TransferIncome' && type !== 'TransferExpense') continue;
        const account = byId.get(transaction.account.id);
        const item = totals.get(transaction.account.id) ?? {
            id: transaction.account.id,
            name: account?.name ?? transaction.account.name,
            currency: transaction.account.currencyCode,
            color: account?.color ?? '#67a6c1',
            incoming: 0,
            outgoing: 0,
            net: 0,
        };
        if (type === 'TransferIncome') item.incoming += Math.abs(transaction.amount);
        else item.outgoing += Math.abs(transaction.amount);
        item.net = Math.round((item.incoming - item.outgoing) * 100) / 100;
        totals.set(item.id, item);
    }
    return [...totals.values()].sort((a, b) => b.net - a.net || a.name.localeCompare(b.name, 'ru'));
}
