import assert from "node:assert/strict";
import test from "node:test";
import type { CustomerReservation } from "./account-data.ts";
import { visibleCustomerReservations } from "./visible-customer-reservations.ts";

function booking(id: string, status: CustomerReservation["status"], year: number): CustomerReservation {
  return {
    id, status, startAt: new Date(year, 0, 1), menuName: "カット", menuImageUrl: "",
    endAt: null, durationMinutes: 60, price: null, request: "",
  };
}

test("cancelled bookings stay hidden in either source order", () => {
  const cancelled = [
    booking("future", "cancelled", 2098),
    booking("future", "confirmed", 2098),
    booking("past", "confirmed", 2020),
    booking("past", "cancelled", 2020),
  ];
  assert.deepEqual(visibleCustomerReservations(cancelled), []);

  const visited = booking("visited", "completed", 2019);
  const rebooked = booking("rebooked", "confirmed", 2099);
  assert.deepEqual(
    visibleCustomerReservations([visited, ...cancelled, rebooked, { ...rebooked, price: 5000 }]),
    [rebooked, visited],
  );
});
