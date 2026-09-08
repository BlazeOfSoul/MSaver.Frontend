import { Injectable } from '@angular/core';

const KEY = 'msaver.private-cache.v1';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_BYTES = 2_000_000;
let generation = 0;
export function privateCacheGeneration(): number {
    return generation;
}

export function clearPrivateDataCache(keepUserId?: string): void {
    try {
        const cached = localStorage.getItem(KEY);
        if (!keepUserId || (cached && JSON.parse(cached).userId !== keepUserId)) {
            generation++;
            localStorage.removeItem(KEY);
        }
    } catch {
        try {
            localStorage.removeItem(KEY);
        } catch {
            /* Storage unavailable. */
        }
    }
}

@Injectable({ providedIn: 'root' })
export class PrivateDataCache {
    read<T>(userId: string | null, query: string): { value: T; savedAt: number } | null {
        if (!userId) return null;
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw || raw.length > MAX_BYTES) return null;
            const entry = JSON.parse(raw, (_, value) =>
                value?.$map
                    ? Object.assign(
                          new Map(
                              value.$map.map(([key, rate]: [string, number | null]) => [
                                  key,
                                  rate ?? NaN,
                              ]),
                          ),
                          value.meta,
                      )
                    : value,
            );
            if (
                entry.userId !== userId ||
                entry.query !== query ||
                !Number.isFinite(entry.savedAt) ||
                Date.now() - entry.savedAt > MAX_AGE_MS ||
                entry.savedAt > Date.now()
            )
                return null;
            return { value: entry.value, savedAt: entry.savedAt };
        } catch {
            return null;
        }
    }

    write<T>(userId: string | null, query: string, value: T): void {
        if (!userId) return;
        try {
            const raw = JSON.stringify({ userId, query, savedAt: Date.now(), value }, (_, item) =>
                item instanceof Map ? { $map: [...item], meta: { ...item } } : item,
            );
            if (raw.length <= MAX_BYTES) localStorage.setItem(KEY, raw);
            else localStorage.removeItem(KEY);
        } catch {
            /* A full or unavailable cache must never block live data. */
        }
    }
}
