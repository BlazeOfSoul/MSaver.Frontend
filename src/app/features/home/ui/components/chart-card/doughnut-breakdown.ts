import { MS_CATEGORY_OTHER_COLOR } from '../../../../../shared/theme/theme-colors';
import { HomeChartDataset } from '../../home-page.models';
import { resolveChartLegendColor } from './chart-card.config';

export interface DoughnutItem {
    key: string;
    label: string;
    value: number;
    color: string;
    memberCount: number;
}

export function buildDoughnutBreakdown(
    labels: readonly string[],
    datasets: readonly HomeChartDataset[],
) {
    const items: DoughnutItem[] = labels
        .map((label, index) => ({
            key: `item-${index}`,
            label,
            value: Number.isFinite(datasets[0]?.data[index])
                ? Math.abs(datasets[0].data[index])
                : 0,
            color: resolveChartLegendColor(index, datasets),
            memberCount: 1,
        }))
        .sort((a, b) => b.value - a.value);
    const active = items.filter((item) => item.value > 0);
    const grouped = datasets.length === 1 && active.length > 6;
    const remainder = grouped ? active.slice(5) : [];
    const slices: DoughnutItem[] = grouped
        ? [
              ...active.slice(0, 5),
              {
                  key: 'remaining',
                  label: `Остальные · ${remainder.length}`,
                  value: remainder.reduce((sum, item) => sum + item.value, 0),
                  color: MS_CATEGORY_OTHER_COLOR,
                  memberCount: remainder.length,
              },
          ]
        : active;
    return { items, slices, grouped, total: active.reduce((sum, item) => sum + item.value, 0) };
}
