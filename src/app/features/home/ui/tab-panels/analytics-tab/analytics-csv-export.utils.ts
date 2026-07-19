import { TransactionResponse } from '../../../data-access/home-api.models';
import { apiDateTimestamp, monthKey, readApiDateParts } from '../../home-date.utils';

const CSV_BOM = '\uFEFF';
const CSV_SEPARATOR = ';';
const CSV_LINE_BREAK = '\r\n';

const TRANSACTION_TYPE_LABELS: Readonly<Record<TransactionResponse['category']['type'], string>> = {
    Credit: 'Доход',
    Debit: 'Расход',
    TransferIncome: 'Перевод: зачисление',
    TransferExpense: 'Перевод: списание',
};

export interface TransactionsCsvExport {
    content: string;
    fileName: string;
}

export function createTransactionsCsvExport(
    transactions: ReadonlyArray<TransactionResponse>,
    month: Date,
    accountLabel: string,
): TransactionsCsvExport {
    const timeZoneId = resolvedTimeZone();
    const uniqueTransactions = new Map<string, TransactionResponse>();

    for (const transaction of transactions) {
        if (!uniqueTransactions.has(transaction.id)) {
            uniqueTransactions.set(transaction.id, transaction);
        }
    }

    const rows = [...uniqueTransactions.values()]
        .sort(
            (left, right) =>
                apiDateTimestamp(left.date) - apiDateTimestamp(right.date) ||
                left.id.localeCompare(right.id),
        )
        .map((transaction) =>
            [
                csvText(transaction.id),
                csvText(formatLocalIsoDateTime(transaction.date)),
                csvText(timeZoneId),
                csvText(TRANSACTION_TYPE_LABELS[transaction.category.type]),
                csvText(transaction.description, true),
                csvText(transaction.category.name, true),
                csvText(transaction.account.name, true),
                csvText(transaction.account.currencyCode),
                formatAmount(transaction.amount),
            ].join(CSV_SEPARATOR),
        );

    const header = [
        'ID',
        'Дата и время',
        'Часовой пояс',
        'Тип',
        'Описание',
        'Категория',
        'Счёт',
        'Валюта',
        'Сумма',
    ].join(CSV_SEPARATOR);

    return {
        content: `${CSV_BOM}${[header, ...rows].join(CSV_LINE_BREAK)}${CSV_LINE_BREAK}`,
        fileName: `msaver-operations-${monthKey(month)}-${fileSegment(accountLabel)}.csv`,
    };
}

export function formatLocalIsoDateTime(value: string): string {
    const parts = readApiDateParts(value);

    if (!parts) {
        return '';
    }

    const timestamp = apiDateTimestamp(value);
    const instant = new Date(timestamp);
    const offsetMinutes = Number.isFinite(timestamp) ? -instant.getTimezoneOffset() : 0;

    return [
        `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
        `T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`,
        formatOffset(offsetMinutes),
    ].join('');
}

function csvText(value: string, protectFromFormula = false): string {
    let normalized = value ?? '';

    if (protectFromFormula && /^\s*[=+\-@]/u.test(normalized)) {
        normalized = `'${normalized}`;
    }

    return `"${normalized.replaceAll('"', '""')}"`;
}

function formatAmount(value: number): string {
    return Number.isFinite(value) ? value.toFixed(2).replace('.', ',') : '';
}

function formatOffset(offsetMinutes: number): string {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteMinutes = Math.abs(offsetMinutes);

    return `${sign}${pad(Math.floor(absoluteMinutes / 60))}:${pad(absoluteMinutes % 60)}`;
}

function fileSegment(value: string): string {
    const normalized = value
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLocaleLowerCase('en-US')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/gu, '')
        .slice(0, 48);

    return normalized || 'all';
}

function resolvedTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function pad(value: number): string {
    return `${value}`.padStart(2, '0');
}
