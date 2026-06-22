/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('App global loader styles', () => {
    const styles = readFileSync(join(process.cwd(), 'src/app/app.css'), 'utf8');

    it('keeps the global loading cloud roomy and polished', () => {
        const loaderRule = extractRule('.global-loader');
        const spinnerRule = extractRule('.global-loader__spinner');

        expect(loaderRule).toContain('min-height: 3rem');
        expect(loaderRule).toContain('padding: 0 1.15rem');
        expect(loaderRule).toContain('font-size: 0.95rem');
        expect(loaderRule).toContain('font-weight: 700');
        expect(loaderRule).toContain('backdrop-filter: blur(20px) saturate(130%)');
        expect(loaderRule).toContain('0 0 24px var(--color-ms-primary-alpha-14)');
        expect(spinnerRule).toContain('width: 1.15rem');
        expect(spinnerRule).toContain('height: 1.15rem');
    });

    function extractRule(selector: string): string {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

        expect(match?.groups?.['body']).toBeDefined();

        return match!.groups!['body'];
    }
});
