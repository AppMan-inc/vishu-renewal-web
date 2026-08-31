import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryDisplayLabel,
  canonicalCategoryIds,
  groupVisibleMenus,
  isCoupon,
  toggleCategory,
} from "./booking-menu-catalog.ts";

const menus = [
  {
    id: "coupon-color",
    title: "カラートリートメントクーポン",
    categories: ["カラー", "トリートメント"],
    beforePrice: 12000,
    price: 9000,
    priority: 2,
  },
  {
    id: "regular-cut",
    title: "大人カット",
    categories: ["カット"],
    beforePrice: null,
    price: 3800,
    priority: 1,
  },
  {
    id: "coupon-cut",
    title: "カットクーポン",
    categories: ["カット"],
    beforePrice: 6000,
    price: 4400,
    priority: 1,
  },
  {
    id: "regular-other",
    title: "眉毛のお手入れ",
    categories: [],
    beforePrice: null,
    price: 1100,
    priority: 3,
  },
];

test("classifies coupons only by beforePrice nullability", () => {
  assert.equal(isCoupon({ beforePrice: 1 }), true);
  assert.equal(isCoupon({ beforePrice: null }), false);
});

test("shows all menus initially and groups coupons before regular menus", () => {
  const groups = groupVisibleMenus(menus, []);
  assert.deepEqual(groups.coupons.map((menu) => menu.id), [
    "coupon-cut",
    "coupon-color",
  ]);
  assert.deepEqual(groups.regularMenus.map((menu) => menu.id), [
    "regular-cut",
    "regular-other",
  ]);
});

test("applies multiple categories with OR semantics", () => {
  const groups = groupVisibleMenus(menus, ["cut", "color"]);
  assert.deepEqual(
    [...groups.coupons, ...groups.regularMenus].map((menu) => menu.id).sort(),
    ["coupon-color", "coupon-cut", "regular-cut"],
  );
});

test("derives the other category from menus without a known category", () => {
  const groups = groupVisibleMenus(menus, ["other"]);
  assert.deepEqual(groups.coupons, []);
  assert.deepEqual(groups.regularMenus.map((menu) => menu.id), ["regular-other"]);
});

test("toggles category selections without mutating the input", () => {
  const initial = ["cut"];
  assert.deepEqual(toggleCategory(initial, "color"), ["cut", "color"]);
  assert.deepEqual(toggleCategory(initial, "cut"), []);
  assert.deepEqual(initial, ["cut"]);
});

test("normalizes legacy Japanese categories to canonical IDs", () => {
  assert.deepEqual(
    canonicalCategoryIds(["カット", "ヘッドスパ", "縮毛矯正"]),
    ["cut", "straightening", "headSpa"],
  );
});

test("uses readable labels without dropping unknown treatment details", () => {
  assert.equal(categoryDisplayLabel("cut"), "カット");
  assert.equal(categoryDisplayLabel("ヘッドスパ"), "ヘッドスパ");
  assert.equal(categoryDisplayLabel("オリジナル施術"), "オリジナル施術");
});
