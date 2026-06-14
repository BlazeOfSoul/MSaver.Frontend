import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';

@Component({
    selector: 'ms-home-error-alert',
    standalone: true,
    imports: [Button],
    templateUrl: './home-error-alert.component.html',
    styleUrl: './home-error-alert.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeErrorAlertComponent {
    message = input.required<string>();
    dismissing = input<boolean>(false);

    retry = output<void>();
    dismiss = output<void>();
}
