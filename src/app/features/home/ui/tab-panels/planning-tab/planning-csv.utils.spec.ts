import {
    createCsvImportBatchId,
    normalizeCategoryName,
    parseTransactionsCsv,
} from './planning-csv.utils';

describe('planning CSV utils', () => {
    it('creates a stable SHA-256 batch id for the same CSV content', async () => {
        const windowsId = await createCsvImportBatchId('\uFEFFdate,amount\r\n2026-07-01,10\r\n');
        const unixId = await createCsvImportBatchId('date,amount\n2026-07-01,10\n');
        const changedId = await createCsvImportBatchId('date,amount\n2026-07-01,11\n');

        expect(windowsId).toMatch(/^[a-f0-9]{64}$/);
        expect(windowsId).toBe(unixId);
        expect(changedId).not.toBe(unixId);
    });

    it('parses semicolon-separated CSV with Russian headers and decimal commas', () => {
        const source = [
            'Дата;Сумма;Комментарий;Категория',
            '01.07.2026;"1 234,50";"Обед; с коллегой";Кафе',
        ].join('\r\n');

        expect(parseTransactionsCsv(source)).toEqual([
            {
                sourceRow: 2,
                date: '01.07.2026',
                amount: 1234.5,
                description: 'Обед; с коллегой',
                categoryName: 'Кафе',
                issue: null,
            },
        ]);
    });

    it('parses comma-separated CSV with English headers and quoted fields', () => {
        const source = [
            'date,amount,description,category',
            '2026-07-02,12.50,"Coffee, ""large""","Food and drinks"',
        ].join('\n');

        expect(parseTransactionsCsv(source)).toEqual([
            {
                sourceRow: 2,
                date: '2026-07-02',
                amount: 12.5,
                description: 'Coffee, "large"',
                categoryName: 'Food and drinks',
                issue: null,
            },
        ]);
    });

    it('recognizes supported Russian and English header aliases case-insensitively', () => {
        const russian = ' ДАТА ; SUM ; ОПИСАНИЕ ; КАТЕГОРИЯ \n03.07.2026;25;Такси;Транспорт';
        const english = 'DATE,AMOUNT,COMMENT,CATEGORY\n2026-07-04,30,Taxi,Transport';

        expect(parseTransactionsCsv(russian)[0]).toMatchObject({
            amount: 25,
            description: 'Такси',
            categoryName: 'Транспорт',
        });
        expect(parseTransactionsCsv(english)[0]).toMatchObject({
            amount: 30,
            description: 'Taxi',
            categoryName: 'Transport',
        });
    });

    it.each([
        'amount,category\n10,Food',
        'date,category\n2026-07-01,Food',
        'date,amount\n2026-07-01,10',
    ])('throws when a required header is missing', (source) => {
        expect(() => parseTransactionsCsv(source)).toThrow(
            'CSV должен содержать колонки «Дата», «Сумма» и «Категория».',
        );
    });

    it('keeps incomplete and invalid rows visible for preview', () => {
        const source = [
            'date;amount;description;category',
            '2026-07-01;0;Zero;Food',
            ';10;Missing date;Food',
            '2026-07-03;15;Valid;Food',
            '2026-07-04;invalid;Bad amount;Food',
        ].join('\n');

        expect(parseTransactionsCsv(source)).toEqual([
            {
                sourceRow: 2,
                date: '2026-07-01',
                amount: null,
                description: 'Zero',
                categoryName: 'Food',
                issue: 'Некорректная или нулевая сумма.',
            },
            {
                sourceRow: 3,
                date: '',
                amount: 10,
                description: 'Missing date',
                categoryName: 'Food',
                issue: 'Не указана дата.',
            },
            {
                sourceRow: 4,
                date: '2026-07-03',
                amount: 15,
                description: 'Valid',
                categoryName: 'Food',
                issue: null,
            },
            {
                sourceRow: 5,
                date: '2026-07-04',
                amount: null,
                description: 'Bad amount',
                categoryName: 'Food',
                issue: 'Некорректная или нулевая сумма.',
            },
        ]);
    });

    it('handles UTF-8 BOM and does not mistake quoted semicolons for a delimiter', () => {
        const source =
            '\uFEFFdate,amount,description,category\n2026-07-02,12.50,"Coffee; large",Food';

        expect(parseTransactionsCsv(source)[0]).toMatchObject({
            amount: 12.5,
            description: 'Coffee; large',
            categoryName: 'Food',
            issue: null,
        });
    });

    it('rejects an unterminated quoted field', () => {
        expect(() => parseTransactionsCsv('date,amount,category\n2026-07-02,12.50,"Food')).toThrow(
            'В CSV есть незакрытое поле в кавычках.',
        );
    });

    it.each([
        ['  Продукты  ', 'продукты'],
        ['ВСЁ ДЛЯ ДОМА', 'все для дома'],
        ['Ёлки и ЕЖИ', 'елки и ежи'],
    ])('normalizes category name %j to %j', (source, expected) => {
        expect(normalizeCategoryName(source)).toBe(expected);
    });
});
