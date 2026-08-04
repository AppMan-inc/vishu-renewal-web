import assert from "node:assert/strict";
import test from "node:test";
import { createReservationSchema } from "./schema.ts";

function reservation(overrides: Record<string, unknown> = {}) {
  return {
    salonId: "salon-vishu",
    menuId: "cut",
    startAt: "2026-08-05T01:00:00.000Z",
    customer: {
      name: "山田 花子",
      email: "guest@example.com",
      phone: "09012345678",
    },
    note: "",
    ...overrides,
  };
}

test("reservation schema enforces name, email, and message maxima", () => {
  for (const [field, below, exact, over] of [
    ["name", "名".repeat(29), "名".repeat(30), "名".repeat(31)],
    ["email", `${"a".repeat(44)}@a.co`, `${"a".repeat(45)}@a.co`, `${"a".repeat(46)}@a.co`],
  ] as const) {
    for (const value of [below, exact]) {
      assert.equal(
        createReservationSchema.safeParse(reservation({
          customer: { ...reservation().customer, [field]: value },
        })).success,
        true,
      );
    }
    assert.equal(
      createReservationSchema.safeParse(reservation({
        customer: { ...reservation().customer, [field]: over },
      })).success,
      false,
    );
  }

  for (const length of [299, 300]) {
    assert.equal(
      createReservationSchema.safeParse(reservation({ note: "要".repeat(length) })).success,
      true,
    );
  }
  assert.equal(
    createReservationSchema.safeParse(reservation({ note: "要".repeat(301) })).success,
    false,
  );
});

test("reservation schema accepts 10 and 11 ASCII digits and rejects other phone values", () => {
  for (const phone of ["0721234567", "09012345678"]) {
    assert.equal(
      createReservationSchema.safeParse(reservation({
        customer: { ...reservation().customer, phone },
      })).success,
      true,
    );
  }
  for (const phone of ["090123456789", "090-1234-5678", "０９０１２３４５６７８"]) {
    assert.equal(
      createReservationSchema.safeParse(reservation({
        customer: { ...reservation().customer, phone },
      })).success,
      false,
    );
  }
});
