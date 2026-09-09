import { MS_ACCOUNT_COLORS } from '../../../shared/theme/theme-colors';

export function nextAccountColor(existing: ReadonlyArray<string>): string {
    const counts = new Map<string, number>();
    for (const color of existing)
        counts.set(color.toLowerCase(), (counts.get(color.toLowerCase()) ?? 0) + 1);
    return MS_ACCOUNT_COLORS.reduce(
        (best, color) => ((counts.get(color) ?? 0) < (counts.get(best) ?? 0) ? color : best),
        MS_ACCOUNT_COLORS[0],
    );
}
