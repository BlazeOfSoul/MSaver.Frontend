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
    const selectDropdownStyles = readFileSync(
        join(process.cwd(), 'src/app/shared/ui/select/select.dropdown.css'),
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

    it('keeps select surfaces sharp without backdrop blur filters', () => {
        const shellRule = extractRule(selectStyles, '.ms-select__shell');
        const searchRule = extractRule(selectSearchStyles, '.ms-select__search');

        expect(shellRule).not.toContain('backdrop-filter');
        expect(searchRule).not.toContain('backdrop-filter');
    });

    it('keeps the sticky select search fade sharp instead of blurring options', () => {
        const stickyFadeRule = extractRule(selectSearchStyles, '.ms-select__search::after');

        expect(stickyFadeRule).not.toContain('backdrop-filter');
        expect(stickyFadeRule).toContain('pointer-events: none');
    });

    it('prevents horizontal dropdown scrollbars while preserving vertical option scroll', () => {
        const dropdownRule = extractRule(selectDropdownStyles, '.ms-select__dropdown');
        const hoverRule = extractRule(selectDropdownStyles, '.ms-select__option:hover');

        expect(dropdownRule).toContain('overflow-x: hidden');
        expect(dropdownRule).toContain('overflow-y: auto');
        expect(dropdownRule).not.toContain('overflow: auto');
        expect(hoverRule).not.toContain('transform');
    });

    function extractRule(styles: string, selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }
});
