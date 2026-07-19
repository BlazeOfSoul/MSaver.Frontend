/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readPlanningFile = (fileName: string): string =>
    readFileSync(
        join(process.cwd(), 'src/app/features/home/ui/tab-panels/planning-tab', fileName),
        'utf8',
    );

describe('PlanningTab responsive styles', () => {
    const baseStyles = readPlanningFile('planning-tab.component.css');
    const dialogStyles = readPlanningFile('planning-tab.part-3.css');
    const mobileCardStyles = readPlanningFile('planning-tab.part-4.css');
    const modalStyles = readPlanningFile('planning-tab.part-5.css');
    const narrowStyles = readPlanningFile('planning-tab.part-6.css');
    const template = readPlanningFile('planning-tab.component.html');

    it('uses the same compact two-column form structure as existing app dialogs', () => {
        expect(baseStyles).toMatch(
            /\.planning-form--recurring\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s,
        );
        expect(dialogStyles).toMatch(
            /\.planning-date-time,\s*\.planning-form--recurring\s*>\s*ms-button\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s,
        );
        expect(modalStyles).toContain('width: min(42rem, calc(100vw - 2rem))');
    });

    it('keeps due actions and delete aligned in one row on normal phone widths', () => {
        const phoneStyles = mobileCardStyles.slice(
            mobileCardStyles.indexOf('@media (max-width: 640px)'),
        );

        expect(phoneStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) auto');
        expect(phoneStyles).toContain('.recurring-row__actions:not(:has(.recurring-row__skip))');
        expect(narrowStyles).toContain('@media (max-width: 400px)');
        expect(narrowStyles).not.toContain('grid-row: 2');
    });

    it('uses two equal confirmation actions and a passive future status', () => {
        expect(dialogStyles).toMatch(
            /\.planning-confirm-dialog__actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s,
        );
        expect(template).toContain('class="recurring-row__status"');
        expect(template.match(/\[fullWidth\]="true"/g)?.length).toBeGreaterThanOrEqual(3);
    });

    it('keeps all three actions compact at 320px and 360px widths', () => {
        expect(narrowStyles).toContain('@media (max-width: 400px)');
        expect(narrowStyles).toContain('padding: 0.72rem');
        expect(narrowStyles).toContain('gap: 0.3rem');
        expect(narrowStyles).toContain('padding-inline: 0.25rem');
        expect(narrowStyles).toContain('font-size: 0.75rem');
        expect(narrowStyles).toContain('white-space: nowrap');
        expect(narrowStyles).toContain('@media (max-width: 350px)');
        expect(narrowStyles).toContain('padding-inline: 0.125rem');
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
