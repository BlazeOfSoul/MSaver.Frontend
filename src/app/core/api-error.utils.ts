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
    if (!(error instanceof HttpErrorResponse) || !isRecord(error.error)) {
        return null;
    }

    const apiError = error.error;

    return {
        code: typeof apiError['code'] === 'string' ? apiError['code'] : '',
        message: typeof apiError['message'] === 'string' ? apiError['message'] : '',
        details: readApiErrorDetails(apiError['details']),
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

function readApiErrorDetails(value: unknown): ApiErrorDetails {
    if (!isRecord(value)) {
        return {};
    }

    return Object.entries(value).reduce<ApiErrorDetails>((details, [field, messages]) => {
        if (!Array.isArray(messages)) {
            return details;
        }

        const safeMessages = messages.filter(
            (message): message is string => typeof message === 'string',
        );

        if (!safeMessages.length) {
            return details;
        }

        details[field] = safeMessages;
        return details;
    }, {});
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
