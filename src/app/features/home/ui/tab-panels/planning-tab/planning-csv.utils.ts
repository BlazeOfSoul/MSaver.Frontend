export interface ParsedCsvRow {
    sourceRow: number;
    date: string;
    amount: number | null;
    description: string;
    categoryName: string;
    issue: string | null;
}

export async function createCsvImportBatchId(source: string): Promise<string> {
    if (!globalThis.crypto?.subtle) {
        throw new Error('Браузер не поддерживает безопасный идентификатор CSV-импорта.');
    }

    const normalizedSource = source.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
    const digest = await globalThis.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(normalizedSource),
    );

    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
        '',
    );
}

const HEADER_ALIASES = {
    date: ['date', 'дата'],
    amount: ['amount', 'sum', 'сумма'],
    description: ['description', 'comment', 'описание', 'комментарий'],
    category: ['category', 'категория'],
} as const;

export function parseTransactionsCsv(source: string): ParsedCsvRow[] {
    const rows = parseCsv(source.replace(/^\uFEFF/, ''));
    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0].map(normalize);
    const dateIndex = findHeader(headers, HEADER_ALIASES.date);
    const amountIndex = findHeader(headers, HEADER_ALIASES.amount);
    const descriptionIndex = findHeader(headers, HEADER_ALIASES.description);
    const categoryIndex = findHeader(headers, HEADER_ALIASES.category);

    if (dateIndex < 0 || amountIndex < 0 || categoryIndex < 0) {
        throw new Error('CSV должен содержать колонки «Дата», «Сумма» и «Категория».');
    }

    return rows.slice(1).map((row, index) => {
        const date = row[dateIndex]?.trim() ?? '';
        const amount = parseAmount(row[amountIndex] ?? '');
        const categoryName = row[categoryIndex]?.trim() ?? '';
        const issue = !date
            ? 'Не указана дата.'
            : amount === null
              ? 'Некорректная или нулевая сумма.'
              : !categoryName
                ? 'Не указана категория.'
                : null;

        return {
            sourceRow: index + 2,
            date,
            amount,
            categoryName,
            description: descriptionIndex >= 0 ? (row[descriptionIndex] ?? '').trim() : '',
            issue,
        };
    });
}

export function normalizeCategoryName(value: string): string {
    return normalize(value).replaceAll('ё', 'е');
}

function findHeader(headers: ReadonlyArray<string>, aliases: ReadonlyArray<string>): number {
    return headers.findIndex((header) => aliases.includes(header));
}

function parseAmount(value: string): number | null {
    const normalized = value.trim().replaceAll(' ', '').replace(',', '.');
    const amount = Number(normalized);
    return Number.isFinite(amount) && amount !== 0 ? amount : null;
}

function normalize(value: string): string {
    return value.trim().toLocaleLowerCase('ru');
}

function parseCsv(source: string): string[][] {
    const delimiter = detectDelimiter(source);
    const result: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        const next = source[index + 1];

        if (char === '"' && quoted && next === '"') {
            field += '"';
            index++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === delimiter && !quoted) {
            row.push(field);
            field = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') {
                index++;
            }
            row.push(field);
            if (row.some((item) => item.length > 0)) {
                result.push(row);
            }
            row = [];
            field = '';
        } else {
            field += char;
        }
    }

    if (quoted) {
        throw new Error('В CSV есть незакрытое поле в кавычках.');
    }

    row.push(field);
    if (row.some((item) => item.length > 0)) {
        result.push(row);
    }

    return result;
}

function detectDelimiter(source: string): ',' | ';' {
    let commas = 0;
    let semicolons = 0;
    let quoted = false;

    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        const next = source[index + 1];

        if (char === '"' && quoted && next === '"') {
            index++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (!quoted && (char === '\r' || char === '\n')) {
            break;
        } else if (!quoted && char === ',') {
            commas++;
        } else if (!quoted && char === ';') {
            semicolons++;
        }
    }

    return semicolons > commas ? ';' : ',';
}
