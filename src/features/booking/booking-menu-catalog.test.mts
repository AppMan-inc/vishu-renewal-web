import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryDisplayLabel,
  canonicalCategoryIds,
  couponMenuCategoryId,
  defaultSelectedCategoryIds,
  groupVisibleMenus,
  isCoupon,
  menuCategories,
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
    id: "coupon-perm",
    title: "パーマクーポン",
    categories: ["パーマ"],
    beforePrice: 14000,
    price: 11000,
    priority: 3,
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

test("adds coupon as the last category and selects it by default", () => {
  assert.equal(menuCategories.at(-1)?.id, couponMenuCategoryId);
  assert.equal(menuCategories.at(-1)?.label, "クーポン");
  assert.deepEqual(defaultSelectedCategoryIds, [couponMenuCategoryId]);
});

test("includes all coupons only while the coupon category is selected", () => {
  const groups = groupVisibleMenus(menus, [couponMenuCategoryId]);
  assert.deepEqual(groups.coupons.map((menu) => menu.id), [
    "coupon-cut",
    "coupon-color",
    "coupon-perm",
  ]);
  assert.deepEqual(groups.regularMenus.map((menu) => menu.id), [
    "regular-cut",
    "regular-other",
  ]);
});

test("hides all coupons when the coupon category is not selected", () => {
  const groups = groupVisibleMenus(menus, []);
  assert.deepEqual(groups.coupons, []);
  assert.deepEqual(groups.regularMenus.map((menu) => menu.id), [
    "regular-cut",
    "regular-other",
  ]);
});

test("combines the coupon and treatment filters with AND semantics", () => {
  const groups = groupVisibleMenus(menus, [couponMenuCategoryId, "perm"]);
  assert.deepEqual(groups.coupons.map((menu) => menu.id), ["coupon-perm"]);
  assert.deepEqual(groups.regularMenus, []);
});

test("excludes coupons even when they match a selected treatment category", () => {
  const groups = groupVisibleMenus(menus, ["cut", "color"]);
  assert.deepEqual(groups.coupons, []);
  assert.deepEqual(groups.regularMenus.map((menu) => menu.id), ["regular-cut"]);
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
