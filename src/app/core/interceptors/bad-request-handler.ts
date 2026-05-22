import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import z from 'zod';

export const badRequestHandler: HttpInterceptorFn = (req, next) => {
    return next(req).pipe(
        catchError((error) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 400)
                return throwError(() => error);

            const details: Record<string, string[]> = error.error.details ?? {};

            const schema = z.custom().superRefine((_, ctx) => {
                ctx.addIssue(error.error.message);
                Object.keys(details).forEach((field) => {
                    details[field].forEach((message) => {
                        ctx.addIssue({
                            code: 'custom',
                            path: [field],
                            message: message,
                        });
                    });
                });
            });

            return throwError(() => schema.safeParse({}).error!);
        }),
    );
};
