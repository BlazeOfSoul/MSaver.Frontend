import { CdkDrag, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { AccountBalanceItem } from '../../home-page.models';
import { moveAccountIds } from '../../home-account-order.utils';

@Component({
    selector: 'ms-account-order-panel',
    standalone: true,
    imports: [CdkDrag, CdkDragHandle, CdkDropList, Button],
    templateUrl: './account-order-panel.component.html',
    styleUrl: './account-order-panel.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountOrderPanelComponent {
    accounts = input.required<ReadonlyArray<AccountBalanceItem>>();
    saving = input(false);
    reorder = output<ReadonlyArray<string>>();
    readonly announcement = signal('');

    drop(event: { previousIndex: number; currentIndex: number }): void {
        this.move(event.previousIndex, event.currentIndex);
    }

    keyboard(event: KeyboardEvent, index: number): void {
        let target: number;
        switch (event.key) {
            case 'ArrowUp':
                target = index - 1;
                break;
            case 'ArrowDown':
                target = index + 1;
                break;
            case 'Home':
                target = 0;
                break;
            case 'End':
                target = this.accounts().length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        this.move(index, target);
    }

    private move(from: number, to: number): void {
        const accounts = this.accounts();
        if (this.saving() || from === to || !accounts[from] || !accounts[to]) return;
        this.reorder.emit(
            moveAccountIds(
                accounts.map((account) => account.id),
                from,
                to,
            ),
        );
        this.announcement.set(`${accounts[from].name}: позиция ${to + 1} из ${accounts.length}`);
    }
}
