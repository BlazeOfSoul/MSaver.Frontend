import { vi } from 'vitest';

type CanvasGradientStub = {
    addColorStop: (offset: number, color: string) => void;
};

function createGradientStub(): CanvasGradientStub {
    return {
        addColorStop: () => undefined,
    };
}

function createCanvasContextStub(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    return {
        canvas,
        save: () => undefined,
        restore: () => undefined,
        resetTransform: () => undefined,
        clearRect: () => undefined,
        fillRect: () => undefined,
        strokeRect: () => undefined,
        beginPath: () => undefined,
        closePath: () => undefined,
        moveTo: () => undefined,
        lineTo: () => undefined,
        bezierCurveTo: () => undefined,
        quadraticCurveTo: () => undefined,
        arc: () => undefined,
        arcTo: () => undefined,
        rect: () => undefined,
        fill: () => undefined,
        stroke: () => undefined,
        clip: () => undefined,
        translate: () => undefined,
        rotate: () => undefined,
        scale: () => undefined,
        setTransform: () => undefined,
        fillText: () => undefined,
        strokeText: () => undefined,
        setLineDash: () => undefined,
        getLineDash: () => [],
        measureText: (text: string) => ({ width: text.length * 6 }),
        createLinearGradient: createGradientStub,
        createRadialGradient: createGradientStub,
        createPattern: () => null,
    } as unknown as CanvasRenderingContext2D;
}

if (typeof HTMLCanvasElement !== 'undefined') {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: vi.fn(function getContext(
            this: HTMLCanvasElement,
            contextId: string,
        ): CanvasRenderingContext2D | null {
            return contextId === '2d' ? createCanvasContextStub(this) : null;
        }),
    });
}

if (typeof ResizeObserver === 'undefined') {
    class ResizeObserverStub implements ResizeObserver {
        observe(): void {
            // jsdom does not lay out canvases; Chart.js only needs the API to exist in tests.
        }

        unobserve(): void {
            // See observe().
        }

        disconnect(): void {
            // See observe().
        }
    }

    Object.defineProperty(globalThis, 'ResizeObserver', {
        configurable: true,
        writable: true,
        value: ResizeObserverStub,
    });
}
