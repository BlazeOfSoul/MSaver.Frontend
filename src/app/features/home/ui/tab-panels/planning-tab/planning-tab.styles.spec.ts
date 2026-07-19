/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PlanningTab mobile styles', () => {
    const styles = readFileSync(
        join(
            process.cwd(),
            'src/app/features/home/ui/tab-panels/planning-tab/planning-tab.part-6.css',
        ),
        'utf8',
    );
    const template = readFileSync(
        join(
            process.cwd(),
            'src/app/features/home/ui/tab-panels/planning-tab/planning-tab.component.html',
        ),
        'utf8',
    );

    it('moves delete below recurring actions throughout the phone breakpoint', () => {
        const phoneStyles = styles.slice(
            styles.indexOf('@media (max-width: 400px)'),
            styles.indexOf('@media (max-width: 350px)'),
        );
        const actionsRule = phoneStyles.match(
            /\.recurring-row__actions\s*\{(?<body>[^}]*)\}/,
        )?.groups?.['body'];
        const deleteRule = phoneStyles.match(
            /\.recurring-row__delete\s*\{(?<body>[^}]*)\}/,
        )?.groups?.['body'];

        expect(actionsRule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
        expect(deleteRule).toContain('grid-column: 2');
        expect(deleteRule).toContain('grid-row: 2');
        expect(deleteRule).toContain('justify-self: end');
    });

    it('uses compact action padding only on very narrow screens', () => {
        const narrowStyles = styles.slice(styles.indexOf('@media (max-width: 350px)'));

        expect(narrowStyles).toContain('padding-inline: 0.375rem');
    });

    it('hides decorative Material Symbols from assistive technology', () => {
        const iconTags = template.match(
            /<span\b[^>]*class="[^"]*\bmaterial-symbols-outlined\b[^"]*"[^>]*>/g,
        );

        expect(iconTags?.length).toBeGreaterThan(0);
        for (const tag of iconTags ?? []) {
            expect(tag).toContain('aria-hidden="true"');
        }
    });
});
