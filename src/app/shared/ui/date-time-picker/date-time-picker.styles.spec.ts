/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('DateTimePicker mobile styles', () => {
    const styles = readFileSync(
        join(
            process.cwd(),
            'src/app/shared/ui/date-time-picker/date-time-picker.mobile.css',
        ),
        'utf8',
    );

    it('anchors the popup to both sides of its field without viewport overflow', () => {
        const mobileStyles = styles.slice(styles.indexOf('@media (max-width: 480px)'));
        const dropdownRule = mobileStyles.match(
            /\.ms-date-time-picker__dropdown\s*\{(?<body>[^}]*)\}/,
        )?.groups?.['body'];

        expect(dropdownRule).toContain('right: 0');
        expect(dropdownRule).toContain('left: 0');
        expect(dropdownRule).toContain('width: auto');
        expect(dropdownRule).toContain('max-width: none');
    });
});
