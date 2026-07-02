/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Auth page responsive styles', () => {
    const baseStyles = readFileSync(
        join(process.cwd(), 'src/app/features/auth/ui/auth-page.component.css'),
        'utf8',
    );
    const responsiveStyles = readFileSync(
        join(process.cwd(), 'src/app/features/auth/ui/auth-page.part-3.css'),
        'utf8',
    ).concat(
        readFileSync(join(process.cwd(), 'src/app/features/auth/ui/auth-page.part-4.css'), 'utf8'),
    );

    it('lets the auth shell use the small viewport height on compact mobile screens', () => {
        const shellRule = extractRule(baseStyles, '.auth-shell');

        expect(shellRule).toContain('min-height: 100svh');
    });

    it('compacts vertical spacing on short mobile screens to avoid an initial page scroll', () => {
        expect(responsiveStyles).toContain('@media (max-width: 640px) and (max-height: 720px)');
        expect(responsiveStyles).toContain('.auth-header');
        expect(responsiveStyles).toContain('.auth-copy h2');
        expect(responsiveStyles).toContain('.security-note');
    });

    function extractRule(styles: string, selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }
});
