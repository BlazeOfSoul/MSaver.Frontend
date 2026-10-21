import { ArcElement, Plugin } from 'chart.js';
import { HomeChartType } from '../../home-page.models';

export function formatChartPercent(value: number, total: number): string {
    const percent = total > 0 ? (Math.abs(value) / total) * 100 : 0;
    return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`;
}

// Keep small, crowded slices in the legend instead of overlapping their labels.
export function doughnutPercentLabels(color: string): Plugin<HomeChartType> {
    return {
        id: 'doughnutPercentLabels',
        afterDatasetsDraw(chart) {
            const dataset = chart.data.datasets[0];
            if (!dataset || !chart.isDatasetVisible(0)) return;

            const values = dataset.data.map((value, index) =>
                chart.getDataVisibility(index) &&
                typeof value === 'number' &&
                Number.isFinite(value)
                    ? Math.abs(value)
                    : 0,
            );
            const total = values.reduce((sum, value) => sum + value, 0);
            if (!total) return;

            const { ctx } = chart;
            ctx.save();
            ctx.font = '500 12px Inter, sans-serif';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const occupied: { x: number; y: number; width: number }[] = [];
            const arcs = chart.getDatasetMeta(0).data;
            const indices = values.map((_, index) => index).sort((a, b) => values[b] - values[a]);
            for (const index of indices) {
                const arc = arcs[index];
                if (!values[index] || !(arc instanceof ArcElement) || !arc.circumference) continue;

                const angle = (arc.startAngle + arc.endAngle) / 2;
                const radius = arc.outerRadius + 16;
                const text = formatChartPercent(values[index], total);
                const width = ctx.measureText(text).width;
                const x = Math.max(
                    width / 2 + 2,
                    Math.min(chart.width - width / 2 - 2, arc.x + Math.cos(angle) * radius),
                );
                const y = Math.max(8, Math.min(chart.height - 8, arc.y + Math.sin(angle) * radius));
                if (
                    occupied.some(
                        (label) =>
                            Math.abs(label.x - x) < (label.width + width) / 2 + 6 &&
                            Math.abs(label.y - y) < 18,
                    )
                )
                    continue;

                ctx.fillText(text, x, y);
                occupied.push({ x, y, width });
            }
            ctx.restore();
        },
    };
}
