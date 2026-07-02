/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Input and select mobile text sizing', () => {
    const globalStyles = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');
    const selectStyles = readFileSync(
        join(process.cwd(), 'src/app/shared/ui/select/select.css'),
        'utf8',
    );
    const selectSearchStyles = readFileSync(
        join(process.cwd(), 'src/app/shared/ui/select/select.search.css'),
        'utf8',
    );

    it('keeps text inputs at 16px so iOS does not zoom the PWA on focus', () => {
        const inputRule = extractRule(globalStyles, 'ms-input input');

        expect(inputRule).toContain('font-size: 16px');
    });

    it('keeps select triggers and searchable inputs at 16px on mobile', () => {
        const triggerRule = extractRule(selectStyles, '.ms-select__trigger');
        const searchInputRule = extractRule(selectSearchStyles, '.ms-select__search-input');

        expect(triggerRule).toContain('font-size: 1rem');
        expect(searchInputRule).toContain('font-size: 1rem');
        expect(selectStyles).not.toContain('font-size: 0.92rem');
    });

    function extractRule(styles: string, selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }
});
