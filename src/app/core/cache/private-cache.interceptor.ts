import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';
import { isApiRequestUrl, currentOrigin } from '../http/api-url.utils';
import { clearPrivateDataCache } from './private-data-cache';

export const privateCacheInterceptor: HttpInterceptorFn = (request, next) => {
    const mutatesData =
        isApiRequestUrl(request.url) &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
        !new URL(request.url, currentOrigin()).pathname.toLowerCase().startsWith('/api/auth/');
    if (!mutatesData) return next(request);
    // Invalidate before and after writes so overlapping old reads cannot repopulate stale snapshots.
    clearPrivateDataCache();
    return next(request).pipe(
        tap((event) => {
            if (event instanceof HttpResponse) clearPrivateDataCache();
        }),
    );
};
