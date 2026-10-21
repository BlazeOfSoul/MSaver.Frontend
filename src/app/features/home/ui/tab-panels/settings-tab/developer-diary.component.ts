import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RELEASE_NOTES } from './release-notes';

@Component({
    selector: 'ms-developer-diary',
    standalone: true,
    templateUrl: './developer-diary.component.html',
    styleUrl: './developer-diary.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeveloperDiaryComponent {
    readonly releases = RELEASE_NOTES;
    readonly changeLabels = { new: 'Новое', improved: 'Улучшено', fixed: 'Исправлено' };
    readonly published = this.releases.filter((release) => !release.preview);
}
