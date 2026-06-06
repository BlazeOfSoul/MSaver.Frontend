import { HttpErrorResponse } from '@angular/common/http';
import { getApiFieldError, toFriendlyApiError } from './api-error.utils';

describe('api-error utils', () => {
    it('returns backend messages and field details from Result-pattern errors', () => {
        const error = new HttpErrorResponse({
            status: 409,
            error: {
                code: 'Account.NameAlreadyExists',
                message: 'Счёт с таким названием уже существует.',
                details: {
                    Name: ['Название уже занято.'],
                },
            },
        });

        expect(toFriendlyApiError(error, 'Fallback')).toBe(
            'Счёт с таким названием уже существует.',
        );
        expect(getApiFieldError(error, 'name')).toBe('Название уже занято.');
    });

    it('hides technical transport messages from users', () => {
        const error = new HttpErrorResponse({
            status: 0,
            error: new ProgressEvent('error'),
        });

        expect(toFriendlyApiError(error, 'Fallback')).toBe(
            'Не удалось получить данные. Проверьте подключение и попробуйте ещё раз.',
        );
    });
});
