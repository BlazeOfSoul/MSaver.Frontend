import { CategoryResponse } from '../data-access/home-api.models';
import {
    CATEGORY_SORT_MODE_STORAGE_KEY,
    moveCategoryPriority,
    normalizeCategorySortMode,
    sortCategoriesForDisplay,
} from './home-category-order.utils';

function category(id: string, name: string, type: 'Credit' | 'Debit' = 'Debit'): CategoryResponse {
    return {
        id,
        name,
        type,
        color: '#23c78b',
        isSystem: false,
    };
}

describe('home category order utils', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('sorts categories by stored priority and appends new categories after known ids', () => {
        const categories = [
            category('food', 'Food'),
            category('rent', 'Rent'),
            category('taxi', 'Taxi'),
        ];

        expect(sortCategoriesForDisplay(categories, ['taxi', 'food'], 'priority')).toEqual([
            categories[2],
            categories[0],
            categories[1],
        ]);
    });

    it('sorts categories alphabetically when the display mode asks for alphabetic order', () => {
        const categories = [
            category('taxi', 'Taxi'),
            category('food', 'Food'),
            category('rent', 'Rent'),
        ];

        expect(sortCategoriesForDisplay(categories, ['taxi', 'food'], 'alphabetical')).toEqual([
            categories[1],
            categories[2],
            categories[0],
        ]);
    });

    it('moves category priority only within the same category type', () => {
        const categories = [
            category('salary', 'Salary', 'Credit'),
            category('food', 'Food', 'Debit'),
            category('rent', 'Rent', 'Debit'),
        ];

        expect(moveCategoryPriority(categories, ['salary', 'food', 'rent'], 'rent', 'up')).toEqual([
            'salary',
            'rent',
            'food',
        ]);
        expect(moveCategoryPriority(categories, ['salary', 'food', 'rent'], 'salary', 'down')).toEqual([
            'salary',
            'food',
            'rent',
        ]);
    });

    it('normalizes unsupported stored sort modes to priority mode', () => {
        window.localStorage.setItem(CATEGORY_SORT_MODE_STORAGE_KEY, 'random');

        expect(normalizeCategorySortMode('random')).toBe('priority');
    });
});
