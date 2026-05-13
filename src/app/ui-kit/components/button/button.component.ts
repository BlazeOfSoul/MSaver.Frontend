import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ms-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  variant = input<'primary' | 'secondary' | 'ghost'>('primary');
  fullWidth = input<boolean>(true);
}
