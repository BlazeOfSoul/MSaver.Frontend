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

    // Compare parsed origins for every URL form, including //host/api and
    // backslashes normalized by the URL parser. A matching path is not enough.
    return matchesApiPath && requestUrl.origin === apiUrl.origin;
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

function stripTrailingSlash(value: string): string {
    return value.length > 1 ? value.replace(/\/+$/, '') : value;
}
