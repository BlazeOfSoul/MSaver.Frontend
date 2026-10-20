/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Main summary cards styles', () => {
    const styles = readFileSync(
        join(
            process.cwd(),
            'src/app/features/home/ui/components/main-summary-cards/main-summary-cards.component.css',
        ),
        'utf8',
    );

    it('allows large amounts to wrap without forcing the card wider than its grid cell', () => {
        const valueRule = extractRule(styles, '.summary-card__value');

        expect(valueRule).toContain('white-space: normal');
        expect(valueRule).toContain('overflow-wrap: anywhere');
        expect(extractRule(styles, '.summary-card')).toContain(
            'grid-template-columns: auto minmax(0, 1fr)',
        );
        expect(extractRule(styles, '.summary-grid')).toContain(
            'grid-template-columns: minmax(0, 1fr)',
        );
    });

    it('allows debt helper lines to wrap inside narrow cards', () => {
        const helperLineRule = extractRule(styles, '.summary-card__helper--stack > span');

        expect(helperLineRule).toContain('white-space: normal');
        expect(helperLineRule).toContain('overflow-wrap: anywhere');
        expect(helperLineRule).toContain('min-width: 0');
    });

    function extractRule(stylesheet: string, selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }
});
