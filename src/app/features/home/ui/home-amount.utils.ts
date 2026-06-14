export function isPositiveFiniteAmount(amount: number): boolean {
    return Number.isFinite(amount) && amount > 0;
}
