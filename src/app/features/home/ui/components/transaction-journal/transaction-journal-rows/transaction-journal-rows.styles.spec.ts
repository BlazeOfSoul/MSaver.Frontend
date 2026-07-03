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

    it('stretches readable row action buttons across the mobile card', () => {
        const actionsRule = extractLastRule(mobileStyles, '.transactions-table__actions');
        const withEditRule = extractLastRule(
            mobileStyles,
            '.transactions-table__actions.transactions-table__actions--with-edit',
        );
        const actionButtonRule = extractLastRule(
            mobileStyles,
            '.transactions-table__actions .transaction-action-button',
        );
        const iconRule = extractLastRule(
            mobileStyles,
            '.transaction-action-button .material-symbols-outlined',
        );

        expect(actionsRule).toContain('display: grid');
        expect(actionsRule).toContain('padding-left: 0');
        expect(withEditRule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
        expect(actionButtonRule).toContain('width: 100%');
        expect(actionButtonRule).toContain('min-width: 0');
        expect(iconRule).toContain('flex: 0 0 auto');
    });

    it('uses an orange warning tone for the edit action feedback', () => {
        const editActionRule = extractLastRule(
            mobileStyles,
            'ms-button.ms-btn.transaction-edit-action',
        );
        const editHoverRule = extractLastRule(
            mobileStyles,
            'ms-button.ms-btn.transaction-edit-action:hover',
        );

        expect(editActionRule).toContain('--edit-action-color: var(--color-ms-warning)');
        expect(editActionRule).toContain('color: color-mix(in oklab, var(--edit-action-color)');
        expect(editHoverRule).toContain('border-color: color-mix(in oklab, var(--edit-action-color)');
        expect(editHoverRule).toContain('background: color-mix(in oklab, var(--edit-action-color)');
    });

    function extractLastRule(styles: string, selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = [...styles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'))];

        expect(matches.length).toBeGreaterThan(0);

        return matches.at(-1)![1];
    }
});
