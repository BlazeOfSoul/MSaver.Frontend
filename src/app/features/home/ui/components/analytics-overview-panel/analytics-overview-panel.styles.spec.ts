/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Analytics overview panel responsive styles', () => {
    const styles = readFileSync(
        join(
            process.cwd(),
            'src/app/features/home/ui/components/analytics-overview-panel/analytics-overview-panel.component.css',
        ),
        'utf8',
    ).concat(
        readFileSync(
            join(
                process.cwd(),
                'src/app/features/home/ui/components/analytics-overview-panel/analytics-overview-panel.part-2.css',
            ),
            'utf8',
        ),
    );

    it('stretches the three overview metric cards evenly across desktop width', () => {
        const desktopMetricGridRule = styles.match(
            /@media\s*\(min-width:\s*1200px\)\s*\{[\s\S]*?\.metric-grid\s*\{(?<body>[^}]*)\}/,
        );

        expect(desktopMetricGridRule?.groups?.['body']).toContain(
            'grid-template-columns: repeat(3, minmax(0, 1fr))',
        );
        expect(desktopMetricGridRule?.groups?.['body']).not.toContain(
            'grid-template-columns: repeat(4, minmax(0, 1fr))',
        );
    });

    it('splits the mobile analytics view tabs into three equal columns', () => {
        const mobileTabsRule = styles.match(
            /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.analytics-view-tabs\s*\{(?<body>[^}]*)\}/,
        );

        expect(mobileTabsRule?.groups?.['body']).toContain(
            'grid-template-columns: repeat(3, minmax(0, 1fr))',
        );
        expect(mobileTabsRule?.groups?.['body']).not.toContain(
            'grid-template-columns: repeat(4, minmax(0, 1fr))',
        );
    });

    it('splits the analytics view tabs into three equal columns by default', () => {
        const tabsRule = styles.match(/\.analytics-view-tabs\s*\{(?<body>[^}]*)\}/);

        expect(tabsRule?.groups?.['body']).toContain('display: grid');
        expect(tabsRule?.groups?.['body']).toContain(
            'grid-template-columns: repeat(3, minmax(0, 1fr))',
        );
    });
    it('stacks the account filter and full-width export button on phones', () => {
        const mobileToolbar = styles.match(
            /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.analytics-toolbar\s*\{(?<body>[^}]*)\}/,
        );
        const mobileExport = styles.match(
            /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.analytics-toolbar__export\s*\{(?<body>[^}]*)\}/,
        );

        expect(mobileToolbar?.groups?.['body']).toContain('grid-template-columns: minmax(0, 1fr)');
        expect(mobileExport?.groups?.['body']).toContain('width: 100%');
    });
});
