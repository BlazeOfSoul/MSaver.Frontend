import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    effect,
    HostListener,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { resolveLocalWallClock } from '../../utils/local-date-time.utils';

let nextDateTimePickerId = 0;

@Component({
    selector: 'ms-date-time-picker',
    standalone: true,
    templateUrl: './date-time-picker.html',
    styleUrls: [
        './date-time-picker.css',
        './date-time-picker.dropdown.css',
        './date-time-picker.mobile.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimePickerComponent {
    label = input('Дата и время');
    value = input('');
    disabled = input(false);

    valueChange = output<string>();
    validityChange = output<boolean>();

    readonly open = signal(false);
    readonly dateText = signal('');
    readonly timeText = signal('');
    readonly valid = signal(true);
    readonly touched = signal(false);

    private readonly valueParts = computed(() => this.parseLocalDateTime(this.value()));
    private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
    private readonly dateInput = viewChild<ElementRef<HTMLInputElement>>('dateInput');
    private lastNotifiedValidity: boolean | null = null;

    readonly instanceId = ++nextDateTimePickerId;
    readonly labelId = `ms-date-time-picker-label-${this.instanceId}`;
    readonly triggerId = `ms-date-time-picker-trigger-${this.instanceId}`;
    readonly valueId = `ms-date-time-picker-value-${this.instanceId}`;
    readonly popupId = `ms-date-time-picker-popup-${this.instanceId}`;
    readonly errorId = `ms-date-time-picker-error-${this.instanceId}`;

    readonly displayValue = computed(() => {
        const parts = [this.dateText().trim(), this.timeText().trim()].filter(Boolean);

        return parts.join(' ') || 'Укажите дату и время';
    });
    readonly showError = computed(() => this.touched() && !this.valid());

    constructor() {
        effect(() => {
            const parts = this.valueParts();

            this.touched.set(false);
            this.dateText.set(parts ? this.formatDateLabel(parts.date) : '');
            this.timeText.set(parts?.time ?? '');
            this.setValidity(parts !== null);
        });

        effect(() => {
            if (this.disabled()) {
                this.closePicker(false);
            }
        });
    }

    toggle(): void {
        if (this.disabled()) {
            return;
        }

        if (this.open()) {
            this.closePicker(false);
            return;
        }

        this.open.set(true);
        queueMicrotask(() => this.dateInput()?.nativeElement.focus());
    }

    onControlKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || !this.open()) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.closePicker(true);
    }

    @HostListener('document:pointerdown', ['$event'])
    onDocumentPointerDown(event: PointerEvent): void {
        const target = event.target;

        if (
            this.open() &&
            target instanceof Node &&
            !this.hostElement.nativeElement.contains(target)
        ) {
            this.closePicker(false);
        }
    }

    onDateInput(event: Event): void {
        const target = event.target instanceof HTMLInputElement ? event.target : null;
        const nextText = this.normalizeDateInputText(target?.value ?? '');
        const nextDate = this.parseDateInputText(nextText);

        this.touched.set(true);
        this.dateText.set(nextText);

        if (target && target.value !== nextText) {
            target.value = nextText;
        }

        this.commitCandidate(nextDate, this.resolveTimePart());
    }

    onTimeInput(event: Event): void {
        const target = event.target instanceof HTMLInputElement ? event.target : null;
        const rawText = target?.value ?? '';
        const nextTime = this.normalizeTimePart(rawText);
        const nextText = nextTime ?? this.normalizeTimeInputText(rawText);

        this.touched.set(true);
        this.timeText.set(nextText);

        if (target && target.value !== nextText) {
            target.value = nextText;
        }

        this.commitCandidate(this.resolveDatePart(), nextTime);
    }

    setDateOffset(days: number): void {
        const date = new Date();
        date.setDate(date.getDate() + days);
        const nextDate = this.toDatePart(date);

        this.touched.set(true);
        this.dateText.set(this.formatDateLabel(nextDate));
        this.commitCandidate(nextDate, this.resolveTimePart());
    }

    setTimeToNow(): void {
        const nextTime = this.toTimePart(new Date());

        this.touched.set(true);
        this.timeText.set(nextTime);
        this.commitCandidate(this.resolveDatePart(), nextTime);
    }

    private closePicker(restoreFocus: boolean): void {
        if (!this.open()) {
            return;
        }

        this.open.set(false);

        if (restoreFocus) {
            queueMicrotask(() => this.trigger()?.nativeElement.focus());
        }
    }

    private commitCandidate(date: string | null, time: string | null): void {
        const isValid = !!date && !!time && this.isValidLocalWallClock(date, time);

        this.setValidity(isValid);

        if (isValid) {
            this.valueChange.emit(`${date}T${time}`);
        }
    }

    private setValidity(valid: boolean): void {
        this.valid.set(valid);

        if (this.lastNotifiedValidity !== valid) {
            this.lastNotifiedValidity = valid;
            this.validityChange.emit(valid);
        }
    }

    private parseLocalDateTime(value: string): { date: string; time: string } | null {
        const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?$/.exec(value.trim());
        const date = this.normalizeIsoDatePart(match?.[1] ?? '');
        const time = this.normalizeTimePart(match?.[2] ?? '') ?? (date ? '00:00' : null);

        return date && time && this.isValidLocalWallClock(date, time) ? { date, time } : null;
    }

    private normalizeIsoDatePart(value: string): string | null {
        const trimmed = value.trim();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return null;
        }

        const [year, month, day] = trimmed.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return trimmed;
    }

    private parseDateInputText(value: string): string | null {
        const trimmed = value.trim();
        const isoDate = this.normalizeIsoDatePart(trimmed);

        if (isoDate) {
            return isoDate;
        }

        const separatedMatch = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);

        if (separatedMatch) {
            const [, day, month, year] = separatedMatch;

            return this.normalizeIsoDatePart(
                `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            );
        }

        const digits = trimmed.replace(/\D/g, '');

        if (digits.length !== 8) {
            return null;
        }

        return this.normalizeIsoDatePart(
            `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`,
        );
    }

    private normalizeDateInputText(value: string): string {
        const trimmed = value.trim();

        if (!trimmed) {
            return '';
        }

        const isoDate = this.normalizeIsoDatePart(trimmed);

        if (isoDate) {
            return this.formatDateLabel(isoDate);
        }

        const parsedDate = this.parseDateInputText(trimmed);

        if (parsedDate) {
            return this.formatDateLabel(parsedDate);
        }

        const digits = trimmed.replace(/\D/g, '').slice(0, 8);

        if (!digits) {
            return '';
        }

        if (digits.length > 4) {
            return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
        }

        if (digits.length > 2) {
            return `${digits.slice(0, 2)}.${digits.slice(2)}`;
        }

        return digits;
    }

    private normalizeTimePart(value: string): string | null {
        const trimmed = value.trim();
        const compactMatch = /^([01]\d|2[0-3])([0-5]\d)$/.exec(trimmed);

        if (compactMatch) {
            return `${compactMatch[1]}:${compactMatch[2]}`;
        }

        return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : null;
    }

    private normalizeTimeInputText(value: string): string {
        const digits = value.replace(/\D/g, '').slice(0, 4);

        return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    }

    private formatDateLabel(value: string): string {
        const [year, month, day] = value.split('-');

        return `${day}.${month}.${year}`;
    }

    private resolveDatePart(): string | null {
        return this.parseDateInputText(this.dateText());
    }

    private resolveTimePart(): string | null {
        return this.normalizeTimePart(this.timeText());
    }

    private isValidLocalWallClock(datePart: string, timePart: string): boolean {
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        return resolveLocalWallClock({ year, month, day, hours, minutes }) !== null;
    }

    private toDatePart(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    private toTimePart(date: Date): string {
        const hours = `${date.getHours()}`.padStart(2, '0');
        const minutes = `${date.getMinutes()}`.padStart(2, '0');

        return `${hours}:${minutes}`;
    }
}
