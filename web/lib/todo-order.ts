// ── Fractional indexing for drag-to-reorder ─────────────────────────────────
//
// Moving a row writes one UPDATE — its new sort_order is the midpoint of its
// neighbours — instead of renumbering every row after it. The cost is that
// repeated inserts into the same gap halve it each time, so after ~50 moves in
// one spot the midpoint stops being distinguishable in float64. `needsRebalance`
// detects that and `rebalance` respaces the list.

/** Below this, two neighbours are close enough that midpoints stop separating. */
const MIN_GAP = 1e-6;

/** Spacing used for appends and after a rebalance. */
const STEP = 1024;

/**
 * A sort_order that places an item between `before` and `after`.
 *
 * Pass `null` for either end: `between(null, first)` prepends,
 * `between(last, null)` appends, `between(null, null)` is the first item.
 */
export function between(before: number | null, after: number | null): number {
  if (before == null && after == null) return 0;
  if (before == null) return (after as number) - STEP;
  if (after == null) return before + STEP;
  return before + (after - before) / 2;
}

/**
 * Where an item dropped at `toIndex` lands, given the list it is dropping into.
 *
 * `orders` must be the sort_orders of the destination list **with the dragged
 * item already removed** — otherwise the item is its own neighbour and the
 * midpoint is its current position, which is a no-op move.
 */
export function orderForIndex(orders: number[], toIndex: number): number {
  const clamped = Math.max(0, Math.min(toIndex, orders.length));
  const before = clamped > 0 ? orders[clamped - 1] : null;
  const after = clamped < orders.length ? orders[clamped] : null;
  return between(before, after);
}

/**
 * True when any adjacent pair has collapsed to within MIN_GAP, or the list is
 * out of order — either way the midpoints can no longer be trusted.
 */
export function needsRebalance(orders: number[]): boolean {
  for (let i = 1; i < orders.length; i += 1) {
    const gap = orders[i] - orders[i - 1];
    if (!Number.isFinite(gap) || gap < MIN_GAP) return true;
  }
  return orders.some((value) => !Number.isFinite(value));
}

/**
 * Evenly respace a list, preserving its current order. Returns one entry per
 * id so the caller can write them back in a single batch.
 */
export function rebalance<T extends { id: string; sort_order: number }>(
  items: T[],
): { id: string; sort_order: number }[] {
  return [...items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({ id: item.id, sort_order: index * STEP }));
}

/** The sort_order for a new item appended to a list. */
export function nextOrder(orders: number[]): number {
  if (orders.length === 0) return 0;
  return Math.max(...orders) + STEP;
}

/** The sort_order for a new item placed at the top of a list. */
export function topOrder(orders: number[]): number {
  if (orders.length === 0) return 0;
  return Math.min(...orders) - STEP;
}

/** Move `fromIndex` to `toIndex`, returning a new array. */
export function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return items;
  next.splice(toIndex, 0, moved);
  return next;
}
