import assert from "node:assert/strict";
import test from "node:test";
import { sortMenusByPrice } from "./booking-menu-sort.ts";

test("sorts menus from the lowest price and puts unknown prices last", () => {
  const menus = [
    { id: "expensive", price: 9000 },
    { id: "unknown", price: 0 },
    { id: "cheapest", price: 3000 },
    { id: "middle", price: 6000 },
  ];

  assert.deepEqual(
    sortMenusByPrice(menus).map((menu) => menu.id),
    ["cheapest", "middle", "expensive", "unknown"],
  );
  assert.deepEqual(menus.map((menu) => menu.id), [
    "expensive",
    "unknown",
    "cheapest",
    "middle",
  ]);
});
