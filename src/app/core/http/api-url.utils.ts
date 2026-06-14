import { environment } from '../../../environments/environment';

const FALLBACK_ORIGIN = 'http://msaver.local';

export function isApiRequestUrl(url: string): boolean {
    const requestUrl = parseUrl(url);
    const apiUrl = parseUrl(environment.apiUrl);

    if (!requestUrl || !apiUrl) {
        return false;
    }

    const apiPath = stripTrailingSlash(apiUrl.pathname) || '/';
    const matchesApiPath =
        requestUrl.pathname === apiPath || requestUrl.pathname.startsWith(`${apiPath}/`);

    if (!matchesApiPath) {
        return false;
    }

    if (isAbsoluteUrl(environment.apiUrl)) {
        return requestUrl.origin === apiUrl.origin;
    }

    if (isAbsoluteUrl(url)) {
        return requestUrl.origin === currentOrigin();
    }

    return true;
}

export function currentOrigin(): string {
    return globalThis.location?.origin || FALLBACK_ORIGIN;
}

function parseUrl(url: string): URL | null {
    try {
        return new URL(url, currentOrigin());
    } catch {
        return null;
    }
}

function isAbsoluteUrl(url: string): boolean {
    return /^[a-z][a-z\d+\-.]*:/i.test(url);
}

function stripTrailingSlash(value: string): string {
    return value.length > 1 ? value.replace(/\/+$/, '') : value;
}
