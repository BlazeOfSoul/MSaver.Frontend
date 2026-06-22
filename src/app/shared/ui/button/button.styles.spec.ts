/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Button design-system styles', () => {
    const styles = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

    it('keeps button text centered within the reusable content wrapper', () => {
        const contentRule = extractRule('ms-button.ms-btn .ms-btn__content');

        expect(contentRule).toContain('align-items: center');
        expect(contentRule).toContain('justify-content: center');
        expect(contentRule).toContain('text-align: center');
        expect(contentRule).toContain('margin: auto');
    });

    it('gives green solid buttons brighter color and stronger hover feedback', () => {
        const primaryRule = extractRule('ms-button.ms-btn.ms-btn-primary');
        const successRule = extractRule('ms-button.ms-btn.ms-btn-success');
        const greenHoverRule = extractRule(
            'ms-button.ms-btn.ms-btn-primary:hover,\n    ms-button.ms-btn.ms-btn-success:hover',
        );

        expect(primaryRule).toContain('--bg-color: var(--color-ms-primary)');
        expect(primaryRule).toContain('--glow-color: var(--color-ms-primary-alpha-28)');
        expect(successRule).toContain('--glow-color: var(--color-ms-success-alpha-24)');
        expect(greenHoverRule).toContain('var(--green-hover-bg)');
        expect(greenHoverRule).toContain('0 20px 38px');
    });

    function extractRule(selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }
});
