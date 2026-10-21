import { ArcElement, Interaction, InteractionModeFunction, Plugin } from 'chart.js';
import { getRelativePosition } from 'chart.js/helpers';
import { HomeChartType } from '../../home-page.models';

declare module 'chart.js' {
    interface InteractionModeMap {
        overlappingDoughnut: InteractionModeFunction;
    }
}

function roundCaps(elements: readonly unknown[], visible: (index: number) => boolean) {
    const arcs = elements.flatMap((element, index) =>
        element instanceof ArcElement && element.circumference > 0 && visible(index)
            ? [{ element, index }]
            : [],
    );
    if (arcs.length < 2) return [];

    // Paint small caps last so a small category remains visible at a shared seam.
    return arcs
        .sort((a, b) => b.element.circumference - a.element.circumference)
        .map(({ element, index }) => {
            const radius = (element.outerRadius + element.innerRadius) / 2;
            return {
                element,
                index,
                x: element.x + Math.cos(element.startAngle) * radius,
                y: element.y + Math.sin(element.startAngle) * radius,
                radius: (element.outerRadius - element.innerRadius) / 2,
            };
        });
}

export const overlappingDoughnut: Plugin<HomeChartType> = {
    id: 'overlapping-doughnut',
    afterDatasetDraw(chart, { index }) {
        const meta = chart.getDatasetMeta(index);
        if (meta.type !== 'doughnut') return;
        const caps = roundCaps(meta.data, (i) => chart.getDataVisibility(i));
        const arc = caps[0]?.element;
        if (!arc) return;

        const { ctx } = chart;
        ctx.save();
        // Keep rounded overlaps inside the ring and flush with their own segment.
        ctx.beginPath();
        ctx.arc(arc.x, arc.y, arc.outerRadius, 0, Math.PI * 2);
        ctx.arc(arc.x, arc.y, arc.innerRadius, 0, Math.PI * 2, true);
        ctx.clip('evenodd');
        for (const cap of caps) {
            ctx.beginPath();
            ctx.arc(cap.x, cap.y, cap.radius, 0, Math.PI * 2);
            ctx.fillStyle = cap.element.options.backgroundColor;
            ctx.fill();
        }
        ctx.restore();
    },
};

// Hit-test in the same order as painting: the visible cap owns its overlap.
Interaction.modes.overlappingDoughnut = (chart, event, _options, useFinalPosition) => {
    const point = getRelativePosition(event, chart);
    for (const meta of chart.getSortedVisibleDatasetMetas()) {
        if (meta.type !== 'doughnut') continue;
        const caps = roundCaps(meta.data, (i) => chart.getDataVisibility(i));
        for (const cap of caps.reverse()) {
            if (Math.hypot(point.x - cap.x, point.y - cap.y) <= cap.radius) {
                return [{ element: cap.element, index: cap.index, datasetIndex: meta.index }];
            }
        }
        for (const [index, element] of meta.data.entries()) {
            if (
                chart.getDataVisibility(index) &&
                element instanceof ArcElement &&
                element.circumference > 0 &&
                element.inRange(point.x, point.y, useFinalPosition ?? false)
            ) {
                return [{ element, index, datasetIndex: meta.index }];
            }
        }
    }
    return [];
};
