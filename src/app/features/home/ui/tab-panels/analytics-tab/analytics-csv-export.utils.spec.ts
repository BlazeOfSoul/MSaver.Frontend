import { TransactionResponse } from '../../../data-access/home-api.models';
import { createTransactionsCsvExport, formatLocalIsoDateTime } from './analytics-csv-export.utils';

describe('analytics CSV export', () => {
    it('creates an Excel-friendly UTF-8 CSV with a stable schema and CRLF rows', () => {
        const timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const result = createTransactionsCsvExport(
            [
                transaction({
                    id: 'expense-id',
                    amount: -12.5,
                    date: '2026-07-19T14:37:12',
                    description: 'Обед; с коллегой',
                }),
            ],
            new Date(2026, 6, 1),
            'Все счета',
        );

        expect(result.content.startsWith('\uFEFF')).toBe(true);
        expect(result.content).toContain(
            'ID;Дата и время;Часовой пояс;Тип;Описание;Категория;Счёт;Валюта;Сумма\r\n',
        );
        expect(result.content).toContain(`"${timeZoneId}";"Расход"`);
        expect(result.content).toContain('"Обед; с коллегой"');
        expect(result.content).toContain(';"BYN";-12,50\r\n');
        expect(result.fileName).toBe('msaver-operations-2026-07-все-счета.csv');
    });

    it('escapes quotes and protects user-controlled spreadsheet formulas', () => {
        const result = createTransactionsCsvExport(
            [
                transaction({
                    description: '=HYPERLINK("https://example.test")',
                    account: {
                        ...transaction().account,
                        name: '+SUM(A1:A2)',
                    },
                    category: {
                        ...transaction().category,
                        name: '@danger',
                    },
                }),
            ],
            new Date(2026, 6, 1),
            'Main',
        );

        expect(result.content).toContain(
            `"'=HYPERLINK(""https://example.test"")";"'@danger";"'+SUM(A1:A2)"`,
        );
    });

    it('deduplicates rows and sorts them by instant and then id', () => {
        const later = transaction({
            id: 'later',
            date: '2026-07-20T10:00:00.000Z',
            category: { ...transaction().category, type: 'Credit' },
            amount: 50,
        });
        const firstB = transaction({ id: 'b', date: '2026-07-19T10:00:00.000Z' });
        const firstA = transaction({
            id: 'a',
            date: '2026-07-19T10:00:00.000Z',
            category: { ...transaction().category, type: 'TransferExpense' },
        });

        const result = createTransactionsCsvExport(
            [later, firstB, firstA, firstA],
            new Date(2026, 6, 1),
            'Main',
        );
        const dataRows = result.content.replace('\uFEFF', '').trimEnd().split('\r\n').slice(1);

        expect(dataRows).toHaveLength(3);
        expect(dataRows[0]).toContain('"a"');
        expect(dataRows[0]).toContain('"Перевод: списание"');
        expect(dataRows[1]).toContain('"b"');
        expect(dataRows[2]).toContain('"later"');
        expect(dataRows[2]).toContain('"Доход"');
    });

    it('formats API timestamps in the device wall clock with an explicit offset', () => {
        const source = '2026-07-19T10:37:12.000Z';
        const instant = new Date(source);
        const offset = -instant.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const absoluteOffset = Math.abs(offset);
        const expectedSuffix = `${sign}${`${Math.floor(absoluteOffset / 60)}`.padStart(2, '0')}:${`${absoluteOffset % 60}`.padStart(2, '0')}`;

        expect(formatLocalIsoDateTime(source)).toMatch(
            new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\${expectedSuffix}$`),
        );
        expect(formatLocalIsoDateTime('not-a-date')).toBe('');
    });
});

function transaction(overrides: Partial<TransactionResponse> = {}): TransactionResponse {
    return {
        id: 'transaction-id',
        account: {
            id: 'account-id',
            name: 'Основной',
            color: '#23c78b',
            currencyCode: 'BYN',
            isArchived: false,
        },
        category: {
            id: 'category-id',
            name: 'Продукты',
            type: 'Debit',
            color: '#ff6f91',
        },
        amount: -25,
        date: '2026-07-19T10:37:12.000Z',
        description: 'Покупка',
        ...overrides,
    };
}
