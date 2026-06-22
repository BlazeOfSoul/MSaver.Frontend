import { monthKey } from './home-date.utils';

export type DebtCategoryKind = 'taken' | 'returned' | 'given' | 'received';

export interface DebtSummary {
    owedByMe: number;
    owedToMe: number;
    balanceAfterClosing: number;
}

export interface DebtTransactionSource {
    category: {
        name: string;
    };
    date: string;
}

export function resolveDebtCategoryKind(categoryName: string): DebtCategoryKind | null {
    const normalized = categoryName.trim().toLowerCase();

    if (normalized.includes('взято в долг')) {
        return 'taken';
    }

    if (normalized.includes('возвращено по долгу')) {
        return 'returned';
    }

    if (normalized.includes('дано в долг')) {
        return 'given';
    }

    if (
        normalized.includes('отдано по долгу') ||
        normalized.includes('получено по долгу') ||
        normalized.includes('вернули долг')
    ) {
        return 'received';
    }

    return null;
}

export function isDebtCategoryName(categoryName: string | null | undefined): boolean {
    return !!categoryName && !!resolveDebtCategoryKind(categoryName);
}

export function createEmptyDebtTotals(): Map<DebtCategoryKind, number> {
    return new Map<DebtCategoryKind, number>([
        ['taken', 0],
        ['returned', 0],
        ['given', 0],
        ['received', 0],
    ]);
}

export function calculateDebtTotals<T extends DebtTransactionSource>(
    transactions: ReadonlyArray<T>,
    readAmount: (transaction: T) => number,
): Map<DebtCategoryKind, number> {
    const totals = createEmptyDebtTotals();

    transactions.forEach((transaction) => {
        const kind = resolveDebtCategoryKind(transaction.category.name);

        if (!kind) {
            return;
        }

        totals.set(kind, (totals.get(kind) ?? 0) + Math.abs(readAmount(transaction)));
    });

    return totals;
}

export function calculateDebtSummary<T extends DebtTransactionSource>(
    transactions: ReadonlyArray<T>,
    primaryBalance: number,
    readAmount: (transaction: T) => number,
): DebtSummary {
    const totals = calculateDebtTotals(transactions, readAmount);
    const owedByMe = Math.max(0, (totals.get('taken') ?? 0) - (totals.get('returned') ?? 0));
    const owedToMe = Math.max(0, (totals.get('given') ?? 0) - (totals.get('received') ?? 0));

    return {
        owedByMe,
        owedToMe,
        balanceAfterClosing: primaryBalance - owedByMe + owedToMe,
    };
}

export function calculateDebtTotalsUntilMonth<T extends DebtTransactionSource>(
    transactions: ReadonlyArray<T>,
    month: Date,
    readAmount: (transaction: T) => number,
): Map<DebtCategoryKind, number> {
    const limitKey = monthKey(month);

    return calculateDebtTotals(
        transactions.filter((transaction) => monthKey(new Date(transaction.date)) <= limitKey),
        readAmount,
    );
}
