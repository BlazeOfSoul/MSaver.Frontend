import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { GlobalLoadingService } from './global-loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const loading = inject(GlobalLoadingService);

    loading.start();

    return next(req).pipe(finalize(() => loading.stop()));
};
