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

    it('keeps desktop metric amounts on one line so debt cards do not break the grid rhythm', () => {
        const valueRule = extractRule(styles, '.summary-card__value');

        expect(valueRule).toContain('white-space: nowrap');
        expect(valueRule).toContain('overflow-wrap: normal');
    });

    function extractRule(stylesheet: string, selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }
});
