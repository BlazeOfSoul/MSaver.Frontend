import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GlobalLoadingService } from './core/loading/global-loading.service';
import { App } from './app';

describe('App', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [provideRouter([])],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should render the router outlet shell', async () => {
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        const compiled = fixture.nativeElement as HTMLElement;

        expect(compiled.querySelector('router-outlet')).not.toBeNull();
    });

    it('should show a global loader while requests are pending', () => {
        const fixture = TestBed.createComponent(App);
        const loading = TestBed.inject(GlobalLoadingService);

        loading.start();
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;

        expect(compiled.querySelector('.global-loader')).not.toBeNull();
        expect(compiled.textContent ?? '').toContain('Обновляем данные');
    });
});
