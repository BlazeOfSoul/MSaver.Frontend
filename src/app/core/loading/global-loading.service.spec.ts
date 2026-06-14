import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { GlobalLoadingService } from './global-loading.service';
import { loadingInterceptor } from './loading.interceptor';

describe('GlobalLoadingService', () => {
    it('keeps the loader visible while any request is pending', () => {
        TestBed.configureTestingModule({
            providers: [GlobalLoadingService],
        });

        const service = TestBed.inject(GlobalLoadingService);

        service.start();
        service.start();
        service.stop();

        expect(service.isLoading()).toBe(true);

        service.stop();

        expect(service.isLoading()).toBe(false);
    });

    it('tracks request lifecycle from the loading interceptor', () => {
        TestBed.configureTestingModule({
            providers: [GlobalLoadingService],
        });

        const service = TestBed.inject(GlobalLoadingService);
        let finishRequest: () => void = () => {};

        TestBed.runInInjectionContext(() => {
            loadingInterceptor(new HttpRequest('GET', '/api/accounts'), () => {
                return new Observable((subscriber) => {
                    finishRequest = () => {
                        subscriber.next(new HttpResponse({ status: 200 }));
                        subscriber.complete();
                    };
                });
            }).subscribe();
        });

        expect(service.isLoading()).toBe(true);

        finishRequest();

        expect(service.isLoading()).toBe(false);
    });

    it('does not track non-api requests in the loading interceptor', () => {
        TestBed.configureTestingModule({
            providers: [GlobalLoadingService],
        });

        const service = TestBed.inject(GlobalLoadingService);

        TestBed.runInInjectionContext(() => {
            loadingInterceptor(new HttpRequest('GET', '/assets/config.json'), () => {
                return new Observable(() => undefined);
            }).subscribe();
        });

        expect(service.isLoading()).toBe(false);
    });
});
