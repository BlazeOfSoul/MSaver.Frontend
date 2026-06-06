import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorDetails = Record<string, string[]>;

export interface ApiErrorResponse {
    code: string;
    message: string;
    details: ApiErrorDetails;
}

const CONNECTION_ERROR_MESSAGE =
    'Не удалось получить данные. Проверьте подключение и попробуйте ещё раз.';

export function readApiError(error: unknown): ApiErrorResponse | null {
    if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') {
        return null;
    }

    const apiError = error.error as Partial<ApiErrorResponse>;

    return {
        code: typeof apiError.code === 'string' ? apiError.code : '',
        message: typeof apiError.message === 'string' ? apiError.message : '',
        details:
            apiError.details && typeof apiError.details === 'object' ? apiError.details : {},
    };
}

export function getApiFieldError(error: unknown, field: string): string {
    const details = readApiError(error)?.details ?? {};
    const detailKey = Object.keys(details).find(
        (key) => key.toLowerCase() === field.toLowerCase(),
    );
    const messages = detailKey ? details[detailKey] : undefined;

    return messages?.[0] ?? '';
}

export function toFriendlyApiError(error: unknown, fallback: string): string {
    const apiError = readApiError(error);

    if (error instanceof HttpErrorResponse && error.status === 0) {
        return CONNECTION_ERROR_MESSAGE;
    }

    if (apiError?.message && !isTechnicalErrorMessage(apiError.message)) {
        return apiError.message;
    }

    return fallback;
}

function isTechnicalErrorMessage(message: string): boolean {
    const normalized = message.trim().toLowerCase();

    return (
        normalized.includes('http failure response') ||
        normalized.includes('failed to fetch') ||
        normalized.includes('load failed') ||
        normalized.includes('unknown error')
    );
}
