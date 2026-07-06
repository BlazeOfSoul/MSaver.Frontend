import { CategoryResponse } from '../data-access/home-api.models';

export type CategorySortMode = 'priority' | 'alphabetical';
export type CategoryMoveDirection = 'up' | 'down';

export const CATEGORY_SORT_MODE_STORAGE_KEY = 'msaver:category-sort-mode';

export function normalizeCategorySortMode(value: string | null | undefined): CategorySortMode {
    return value === 'alphabetical' ? 'alphabetical' : 'priority';
}

export function readStoredCategorySortMode(storage = getCategoryStorage()): CategorySortMode {
    try {
        return normalizeCategorySortMode(storage?.getItem(CATEGORY_SORT_MODE_STORAGE_KEY));
    } catch {
        return 'priority';
    }
}

export function writeStoredCategorySortMode(
    mode: CategorySortMode,
    storage = getCategoryStorage(),
): void {
    try {
        storage?.setItem(CATEGORY_SORT_MODE_STORAGE_KEY, mode);
    } catch {
        return;
    }
}

export function sortCategoriesForDisplay(
    categories: ReadonlyArray<CategoryResponse>,
    priorityIds: ReadonlyArray<string>,
    mode: CategorySortMode,
): CategoryResponse[] {
    if (mode === 'alphabetical') {
        return [...categories].sort((left, right) => left.name.localeCompare(right.name, 'ru'));
    }

    const priorityIndex = new Map(priorityIds.map((id, index) => [id, index]));

    return [...categories].sort((left, right) => {
        const leftIndex = priorityIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = priorityIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;

        if (leftIndex !== rightIndex) {
            return leftIndex - rightIndex;
        }

        return left.name.localeCompare(right.name, 'ru');
    });
}

export function moveCategoryPriority(
    categories: ReadonlyArray<CategoryResponse>,
    priorityIds: ReadonlyArray<string>,
    categoryId: string,
    direction: CategoryMoveDirection,
): string[] {
    const category = categories.find((item) => item.id === categoryId);

    if (!category) {
        return normalizePriorityIds(categories, priorityIds);
    }

    const typeCategories = sortCategoriesForDisplay(
        categories.filter((item) => item.type === category.type),
        priorityIds,
        'priority',
    );
    const typeIndex = typeCategories.findIndex((item) => item.id === categoryId);
    const swapIndex = direction === 'up' ? typeIndex - 1 : typeIndex + 1;
    const swapCategory = typeCategories[swapIndex];

    if (
        typeIndex < 0 ||
        swapIndex < 0 ||
        swapIndex >= typeCategories.length
    ) {
        return normalizePriorityIds(categories, priorityIds);
    }

    const allIds = normalizePriorityIds(categories, priorityIds);
    const currentId = typeCategories[typeIndex].id;
    const swapId = typeCategories[swapIndex].id;
    const currentIndex = allIds.indexOf(currentId);
    const targetIndex = allIds.indexOf(swapId);

    if (currentIndex < 0 || targetIndex < 0) {
        return allIds;
    }

    const nextIds = [...allIds];
    [nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];

    return nextIds;
}

export function normalizePriorityIds(
    categories: ReadonlyArray<CategoryResponse>,
    priorityIds: ReadonlyArray<string>,
): string[] {
    const categoryIds = new Set(categories.map((category) => category.id));
    const knownIds = priorityIds.filter((id) => categoryIds.has(id));
    const knownIdSet = new Set(knownIds);
    const missingIds = categories
        .map((category) => category.id)
        .filter((id) => !knownIdSet.has(id));

    return [...knownIds, ...missingIds];
}

function getCategoryStorage(): Storage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}
