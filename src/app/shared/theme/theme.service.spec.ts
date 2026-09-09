import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
describe('ThemeService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => {
        vi.unstubAllGlobals();
        delete document.documentElement.dataset['theme'];
    });
    it('persists the selected theme and applies it before the next render', () => {
        const service = TestBed.inject(ThemeService);
        service.setPreference('light');
        expect(document.documentElement.dataset['theme']).toBe('light');
        expect(localStorage.getItem('msaver.theme')).toBe('light');
        service.setPreference('unexpected');
        expect(service.selected()).toBe('light');
    });
    it('restores the preference and follows system changes only in system mode', () => {
        localStorage.setItem('msaver.theme', 'system');
        let changed: (event: { matches: boolean }) => void = () => {};
        vi.stubGlobal('matchMedia', () => ({
            matches: false,
            addEventListener: (_: string, callback: typeof changed) => (changed = callback),
            removeEventListener: vi.fn(),
        }));
        const service = TestBed.inject(ThemeService);
        expect(service.resolved()).toBe('light');
        changed({ matches: true });
        expect(document.documentElement.dataset['theme']).toBe('dark');
        service.setPreference('light');
        changed({ matches: true });
        expect(document.documentElement.dataset['theme']).toBe('light');
    });
});
