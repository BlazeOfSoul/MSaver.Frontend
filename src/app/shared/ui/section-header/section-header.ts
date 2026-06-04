import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'ms-section-header',
    standalone: true,
    templateUrl: './section-header.html',
    styleUrl: './section-header.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ms-section-header',
        '[class.ms-section-header-compact]': 'compact()',
    },
})
export class SectionHeader {
    eyebrow = input('');
    title = input('');
    description = input('');
    compact = input(false, { transform: booleanAttribute });
}
