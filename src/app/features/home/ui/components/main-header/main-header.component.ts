import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';

@Component({
    selector: 'ms-main-header',
    standalone: true,
    imports: [Button],
    templateUrl: './main-header.component.html',
    styleUrls: ['./main-header.component.css', './main-header.part-2.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainHeaderComponent {
    monthLabel = input.required<string>();
    userName = input<string | null>(null);

    previousMonth = output<void>();
    nextMonth = output<void>();
    addTransaction = output<void>();
    settings = output<void>();
    logout = output<void>();
}
