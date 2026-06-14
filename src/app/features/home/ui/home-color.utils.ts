const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function resolveHexColor(value: string | null | undefined): string | null {
    const nextColor = (value ?? '').trim();

    return HEX_COLOR_PATTERN.test(nextColor) ? nextColor : null;
}

export function safeHexColor(value: string | null | undefined, fallback: string): string {
    return resolveHexColor(value) ?? fallback;
}
