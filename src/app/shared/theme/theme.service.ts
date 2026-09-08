import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

export type ThemePreference = 'dark' | 'light' | 'system';
const THEME_KEY = 'msaver.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly preference = signal<ThemePreference>(this.readPreference());
    private readonly systemDark = signal(true);
    readonly selected = this.preference.asReadonly();
    readonly resolved = computed(() =>
        this.preference() === 'system' ? (this.systemDark() ? 'dark' : 'light') : this.preference(),
    );

    constructor() {
        const query = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
        if (query) {
            this.systemDark.set(query.matches);
            const changed = (event: MediaQueryListEvent) => {
                this.systemDark.set(event.matches);
                this.apply();
            };
            query.addEventListener('change', changed);
            this.destroyRef.onDestroy(() => query.removeEventListener('change', changed));
        }
        this.apply();
    }

    setPreference(value: string): void {
        if (value !== 'dark' && value !== 'light' && value !== 'system') return;
        this.preference.set(value);
        try {
            this.document.defaultView?.localStorage.setItem(THEME_KEY, value);
        } catch {
            /* Private mode. */
        }
        this.apply();
    }

    private readPreference(): ThemePreference {
        try {
            const value = this.document.defaultView?.localStorage.getItem(THEME_KEY);
            return value === 'light' || value === 'system' ? value : 'dark';
        } catch {
            return 'dark';
        }
    }

    private apply(): void {
        const theme = this.resolved();
        this.document.documentElement.dataset['theme'] = theme;
        this.document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', theme === 'light' ? '#f4f7f5' : '#07110d');
    }
}
