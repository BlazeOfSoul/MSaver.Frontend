import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { GlobalLoadingService } from './global-loading.service';
import { isApiRequestUrl } from '../http/api-url.utils';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const loading = inject(GlobalLoadingService);

    if (!isApiRequestUrl(req.url)) {
        return next(req);
    }

    loading.start();

    return next(req).pipe(finalize(() => loading.stop()));
};
