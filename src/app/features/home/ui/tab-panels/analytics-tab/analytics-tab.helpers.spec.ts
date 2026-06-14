import { MS_ANALYTICS_CHART_COLORS, MS_CATEGORY_COLORS } from '../../../../../shared/theme/theme-colors';
import { CategoryBreakdownItem } from '../../home-page.models';
import {
    buildBreakdownDataset,
    buildNetCashFlowDataset,
    limitBreakdownItems,
    selectLimitedBreakdownItems,
} from './analytics-tab.helpers';

function category(
    id: string,
    name: string,
    amountValue: number,
    color = '',
    type: 'income' | 'expense' = 'expense',
): CategoryBreakdownItem {
    return {
        id,
        name,
        amount: `${amountValue}`,
        amountValue,
        progress: 0,
        color,
        type,
        tone: type === 'income' ? 'good' : 'warning',
        isSystem: false,
    };
}

describe('analytics tab helpers', () => {
    it('sorts category chart items and groups the tail into one other item', () => {
        const items = Array.from({ length: 12 }, (_, index) =>
            category(`category-${index}`, `Category ${index}`, 120 - index),
        );

        const limited = limitBreakdownItems(items, {
            otherLabel: 'Other',
            otherColor: '#999999',
        });

        expect(limited).toHaveLength(10);
        expect(limited.slice(0, 3).map((item) => item.amountValue)).toEqual([120, 119, 118]);
        expect(limited.at(-1)).toMatchObject({
            id: 'other',
            name: 'Other',
            amountValue: 330,
            color: '#999999',
            type: 'expense',
        });
    });

    it('builds one breakdown dataset with fallback colors for missing item colors', () => {
        const dataset = buildBreakdownDataset(
            'Expenses',
            [
                category('rent', 'Rent', 100, '#23c78b'),
                category('food', 'Food', 50, ''),
                category('tax', 'Tax', 25, ''),
            ],
            MS_ANALYTICS_CHART_COLORS.expense,
            MS_CATEGORY_COLORS,
        );

        expect(dataset).toEqual([
            {
                label: 'Expenses',
                data: [100, 50, 25],
                color: MS_ANALYTICS_CHART_COLORS.expense,
                colors: ['#23c78b', MS_CATEGORY_COLORS[1], MS_CATEGORY_COLORS[2]],
            },
        ]);
    });

    it('sorts tag expenses before applying a chart limit or selected tag filter', () => {
        const tags = Array.from({ length: 7 }, (_, index) =>
            category(`tag-${index}`, `Tag ${index}`, 100 - index),
        );

        tags[6] = category('transport-tag', 'Transport', 40);

        expect(selectLimitedBreakdownItems(tags, 'all', '5').map((item) => item.id)).toEqual([
            'tag-0',
            'tag-1',
            'tag-2',
            'tag-3',
            'tag-4',
        ]);
        expect(selectLimitedBreakdownItems(tags, 'transport-tag', '5').map((item) => item.id)).toEqual([
            'transport-tag',
        ]);
        expect(selectLimitedBreakdownItems(tags, 'all', 'all')).toHaveLength(7);
    });

    it('builds net cash flow data from income and expense series', () => {
        expect(
            buildNetCashFlowDataset(
                [
                    { label: 'Jan', income: 120, expense: 80 },
                    { label: 'Feb', income: 60, expense: 90 },
                ],
                'Net',
                MS_ANALYTICS_CHART_COLORS.balance,
            ),
        ).toEqual([
            {
                label: 'Net',
                data: [40, -30],
                color: MS_ANALYTICS_CHART_COLORS.balance,
                fill: true,
            },
        ]);
    });
});
