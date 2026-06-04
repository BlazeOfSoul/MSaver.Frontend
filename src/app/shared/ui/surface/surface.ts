import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'ms-surface',
    standalone: true,
    templateUrl: './surface.html',
    styleUrl: './surface.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ms-surface',
        '[class.ms-surface-hero]': 'variant() === "hero"',
        '[class.ms-surface-panel]': 'variant() === "panel"',
        '[class.ms-surface-tile]': 'variant() === "tile"',
        '[class.ms-surface-section]': 'variant() === "section"',
        '[class.ms-surface-interactive]': 'interactive()',
    },
})
export class Surface {
    variant = input<'hero' | 'panel' | 'tile' | 'section'>('panel');
    interactive = input(false, { transform: booleanAttribute });
}
