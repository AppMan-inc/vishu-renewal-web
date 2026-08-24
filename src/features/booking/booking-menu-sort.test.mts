import assert from "node:assert/strict";
import test from "node:test";
import { sortMenusByPriorityAndPrice } from "./booking-menu-sort.ts";

test("sorts by priority and then by price", () => {
  const menus = [
    { id: "higher-priority", price: 9000, priority: 1 },
    { id: "unknown", price: 0, priority: 2 },
    { id: "cheapest", price: 3000, priority: 2 },
    { id: "middle", price: 6000, priority: 2 },
  ];

  assert.deepEqual(
    sortMenusByPriorityAndPrice(menus).map((menu) => menu.id),
    ["higher-priority", "cheapest", "middle", "unknown"],
  );
  assert.deepEqual(menus.map((menu) => menu.id), [
    "higher-priority",
    "unknown",
    "cheapest",
    "middle",
  ]);
});
