import { buildDoughnutBreakdown } from './doughnut-breakdown';

describe('doughnut breakdown', () => {
    it('preserves all 30 categories and the total while showing five leaders and one group', () => {
        const labels = Array.from({ length: 30 }, (_, index) => `Категория ${index + 1}`);
        const data = Array.from({ length: 30 }, (_, index) => index + 1);
        const colors = data.map((value) => `#${value.toString(16).padStart(6, '0')}`);
        const result = buildDoughnutBreakdown(labels, [
            { label: 'Расходы', data, colors, color: '#123456' },
        ]);
        expect(result.items).toHaveLength(30);
        expect(result.slices).toHaveLength(6);
        expect(result.slices.slice(0, 5).map((item) => item.label)).toEqual(
            labels.slice(-5).reverse(),
        );
        expect(result.slices[0].color).toBe(colors[29]);
        expect(result.slices[5]).toMatchObject({
            label: 'Остальные · 25',
            memberCount: 25,
            value: 325,
        });
        expect(result.slices.reduce((sum, item) => sum + item.value, 0)).toBe(result.total);
        expect(result.total).toBe(465);
        expect(data[0]).toBe(1);
        expect(labels[0]).toBe('Категория 1');
    });

    it('does not draw zero or invalid values and uses the same absolute totals as the ring', () => {
        const result = buildDoughnutBreakdown(
            ['Zero', 'Invalid', 'Negative', 'Positive'],
            [{ label: 'Data', data: [0, NaN, -25, 75], color: '#123456' }],
        );
        expect(result.items).toHaveLength(4);
        expect(result.slices.map((item) => item.value)).toEqual([75, 25]);
        expect(result.total).toBe(100);
        expect(result.grouped).toBe(false);
    });
});
