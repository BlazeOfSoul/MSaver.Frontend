import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'ms-main-empty-state',
    standalone: true,
    templateUrl: './main-empty-state.component.html',
    styleUrl: './main-empty-state.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainEmptyStateComponent {
    icon = input<string>('receipt_long');
    title = input.required<string>();
    description = input.required<string>();
}
