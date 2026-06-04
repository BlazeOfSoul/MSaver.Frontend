import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../../shared/ui/input/input';
import { MsSelectOption, SelectComponent } from '../../../../../shared/ui/select/select';

@Component({
    selector: 'ms-main-toolbar',
    standalone: true,
    imports: [ReactiveFormsModule, InputComponent, SelectComponent],
    templateUrl: './main-toolbar.component.html',
    styleUrl: './main-toolbar.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainToolbarComponent {
    searchControl = input.required<FormControl<string>>();
    accountOptions = input.required<ReadonlyArray<MsSelectOption>>();
    selectedAccountId = input.required<string>();

    accountChange = output<string>();
}
