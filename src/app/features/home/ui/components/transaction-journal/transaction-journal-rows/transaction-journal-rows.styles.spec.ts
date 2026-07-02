/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Transaction journal row mobile styles', () => {
    const mobileStyles = readFileSync(
        join(
            process.cwd(),
            'src/app/features/home/ui/components/transaction-journal/transaction-journal-rows/transaction-journal-rows.part-2.css',
        ),
        'utf8',
    );

    it('aligns row action buttons under the mobile value column as one compact group', () => {
        const actionsRule = extractLastRule(mobileStyles, '.transactions-table__actions');
        const withEditRule = extractLastRule(
            mobileStyles,
            '.transactions-table__actions--with-edit',
        );
        const editActionRule = extractLastRule(mobileStyles, 'ms-button.transaction-edit-action');

        expect(actionsRule).toContain('display: flex');
        expect(actionsRule).toContain('padding-left: calc(5.2rem + 0.75rem)');
        expect(actionsRule).toContain('justify-content: flex-start');
        expect(withEditRule).not.toContain('grid-template-columns');
        expect(editActionRule).toContain('width: auto');
        expect(editActionRule).toContain('min-width: 5.25rem');
    });

    function extractLastRule(styles: string, selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = [...styles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'))];

        expect(matches.length).toBeGreaterThan(0);

        return matches.at(-1)![1];
    }
});
