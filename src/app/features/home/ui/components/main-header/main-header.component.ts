import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';

@Component({
    selector: 'ms-main-header',
    standalone: true,
    imports: [Button],
    templateUrl: './main-header.component.html',
    styleUrl: './main-header.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainHeaderComponent {
    monthLabel = input.required<string>();
    recordsCount = input<number>(0);

    previousMonth = output<void>();
    nextMonth = output<void>();
    addTransaction = output<void>();
    logout = output<void>();
}
