import assert from "node:assert/strict";
import test from "node:test";
import {
  between,
  needsRebalance,
  nextOrder,
  orderForIndex,
  rebalance,
  reorder,
  topOrder,
} from "../lib/todo-order.ts";

test("between lands strictly inside its neighbours", () => {
  const mid = between(0, 1024);
  assert.ok(mid > 0 && mid < 1024);
  assert.equal(mid, 512);
});

test("between handles the open ends", () => {
  assert.equal(between(null, null), 0);
  assert.ok(between(null, 0) < 0); // prepend
  assert.ok(between(0, null) > 0); // append
});

test("orderForIndex places an item at each position", () => {
  const orders = [0, 1024, 2048];
  assert.ok(orderForIndex(orders, 0) < 0);
  assert.ok(orderForIndex(orders, 1) > 0 && orderForIndex(orders, 1) < 1024);
  assert.ok(orderForIndex(orders, 3) > 2048);
});

test("orderForIndex clamps an out-of-range index instead of returning NaN", () => {
  const orders = [0, 1024];
  assert.equal(orderForIndex(orders, -5), orderForIndex(orders, 0));
  assert.equal(orderForIndex(orders, 99), orderForIndex(orders, 2));
  assert.equal(orderForIndex([], 0), 0);
});

test("needsRebalance only fires once a gap has actually collapsed", () => {
  assert.equal(needsRebalance([0, 1024, 2048]), false);
  assert.equal(needsRebalance([]), false);
  assert.equal(needsRebalance([0, 1e-9]), true);
  // Out of order is as untrustworthy as a collapsed gap.
  assert.equal(needsRebalance([1024, 0]), true);
  assert.equal(needsRebalance([0, Number.NaN]), true);
});

test("repeated midpoint insertion eventually needs a rebalance", () => {
  // Drop into the same gap over and over, the way dragging to one spot does.
  let low = 0;
  let high = 1024;
  for (let i = 0; i < 60; i += 1) high = between(low, high);
  assert.equal(needsRebalance([low, high]), true);

  // And a rebalance restores usable spacing.
  const respaced = rebalance([
    { id: "a", sort_order: low },
    { id: "b", sort_order: high },
  ]);
  assert.equal(needsRebalance(respaced.map((r) => r.sort_order)), false);
});

test("rebalance preserves order and respaces evenly", () => {
  const respaced = rebalance([
    { id: "c", sort_order: 5 },
    { id: "a", sort_order: 1 },
    { id: "b", sort_order: 3 },
  ]);
  assert.deepEqual(respaced.map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(respaced.map((r) => r.sort_order), [0, 1024, 2048]);
});

test("nextOrder appends, topOrder prepends", () => {
  assert.ok(nextOrder([0, 1024]) > 1024);
  assert.ok(topOrder([0, 1024]) < 0);
  assert.equal(nextOrder([]), 0);
  assert.equal(topOrder([]), 0);
});

test("reorder moves an item without mutating the input", () => {
  const items = ["a", "b", "c", "d"];
  assert.deepEqual(reorder(items, 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(reorder(items, 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(items, ["a", "b", "c", "d"]);
});

test("a full move round-trip puts the item where it was dropped", () => {
  const list = [
    { id: "a", sort_order: 0 },
    { id: "b", sort_order: 1024 },
    { id: "c", sort_order: 2048 },
  ];
  // Drag "c" to the front. The destination orders must exclude the dragged
  // item, or it is its own neighbour and the move is a no-op.
  const without = list.filter((item) => item.id !== "c").map((item) => item.sort_order);
  const moved = { id: "c", sort_order: orderForIndex(without, 0) };
  const sorted = [...list.filter((i) => i.id !== "c"), moved].sort(
    (x, y) => x.sort_order - y.sort_order,
  );
  assert.deepEqual(sorted.map((i) => i.id), ["c", "a", "b"]);
});
