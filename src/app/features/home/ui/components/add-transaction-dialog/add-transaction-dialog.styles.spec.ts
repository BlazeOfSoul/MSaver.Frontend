/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Add transaction dialog styles', () => {
    const dialogStyles = readFileSync(
        join(
            process.cwd(),
            'src/app/features/home/ui/components/add-transaction-dialog/add-transaction-dialog.component.css',
        ),
        'utf8',
    );
    const dialogFooterStyles = readFileSync(
        join(
            process.cwd(),
            'src/app/features/home/ui/components/add-transaction-dialog/add-transaction-dialog.part-2.css',
        ),
        'utf8',
    );
    const dialogShellStyles = readFileSync(
        join(process.cwd(), 'src/app/shared/ui/dialog-shell/dialog-shell.css'),
        'utf8',
    );

    it('lets the backdrop own vertical scrolling instead of nesting scrollbars inside the dialog', () => {
        const sharedBackdropRule = extractRulePattern(
            dialogShellStyles,
            String.raw`\.dialog-backdrop,\s*\.category-dialog-backdrop`,
        );
        const backdropRule = extractRule(dialogShellStyles, '.dialog-backdrop');
        const dialogRule = extractRule(dialogStyles, '.dialog');
        const footerRule = extractRule(dialogFooterStyles, '.dialog__footer');

        expect(sharedBackdropRule).toContain('overflow-x: hidden');
        expect(sharedBackdropRule).toContain('overflow-y: auto');
        expect(backdropRule).not.toContain('backdrop-filter');
        expect(dialogRule).toContain('overflow: visible');
        expect(dialogRule).not.toContain('overflow: auto');
        expect(footerRule).toContain('position: static');
    });

    function extractRule(styles: string, selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }

    function extractRulePattern(styles: string, selectorPattern: string): string {
        const match = styles.match(new RegExp(`${selectorPattern}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }
});
