import assert from "node:assert/strict";
import test from "node:test";

import { attachPreviousVisits, isFirstVisitReservation, customerVisitSummary, reservationDisplayStatus } from "./reservation-history.ts";
import type { AdminReservation, ReservationStatus } from "./types.ts";

function reservation(
  id: string,
  customerId: string,
  startTime: string,
  status: ReservationStatus,
): AdminReservation {
  return {
    id,
    sourcePath: `reservation/${id}`,
    customerId,
    customerName: "お客様",
    telephoneNumber: "",
    gender: "",
    menuId: "menu-1",
    treatmentDetail: "カット",
    treatmentTimeMinutes: 60,
    price: 3800,
    startTime,
    finishTime: new Date(new Date(startTime).getTime() + 60 * 60_000).toISOString(),
    customerHope: "",
    status,
    previousVisitAt: null,
    createdAt: startTime,
  };
}

test("attaches the latest earlier visited reservation for each customer", () => {
  const firstVisit = reservation("visit-1", "customer-1", "2026-06-01T01:00:00.000Z", "visited");
  const canceled = reservation("canceled", "customer-1", "2026-07-01T01:00:00.000Z", "canceled");
  const secondVisit = reservation("visit-2", "customer-1", "2026-08-01T01:00:00.000Z", "visited");
  const nextBooking = reservation("next", "customer-1", "2026-09-01T01:00:00.000Z", "confirmed");

  const result = attachPreviousVisits(
    [nextBooking, canceled, firstVisit, secondVisit],
    new Date("2026-08-24T00:00:00.000Z"),
  );

  assert.equal(result.find((item) => item.id === "visit-1")?.previousVisitAt, null);
  assert.equal(
    result.find((item) => item.id === "canceled")?.previousVisitAt,
    firstVisit.startTime,
  );
  assert.equal(
    result.find((item) => item.id === "visit-2")?.previousVisitAt,
    firstVisit.startTime,
  );
  assert.equal(
    result.find((item) => item.id === "next")?.previousVisitAt,
    secondVisit.startTime,
  );
});

test("does not count future or simultaneous visits as a previous visit", () => {
  const first = reservation("first", "customer-1", "2026-08-01T01:00:00.000Z", "visited");
  const sameTime = reservation("same", "customer-1", "2026-08-01T01:00:00.000Z", "visited");
  const futureVisit = reservation("future", "customer-1", "2026-09-01T01:00:00.000Z", "visited");
  const laterBooking = reservation("later", "customer-1", "2026-10-01T01:00:00.000Z", "confirmed");

  const result = attachPreviousVisits(
    [first, sameTime, futureVisit, laterBooking],
    new Date("2026-08-24T00:00:00.000Z"),
  );

  assert.equal(result.find((item) => item.id === "first")?.previousVisitAt, null);
  assert.equal(result.find((item) => item.id === "same")?.previousVisitAt, null);
  assert.equal(
    result.find((item) => item.id === "later")?.previousVisitAt,
    first.startTime,
  );
});

test("keeps customer histories separate and treats missing customer IDs as first visits", () => {
  const customerOne = reservation("one", "customer-1", "2026-06-01T01:00:00.000Z", "visited");
  const customerTwo = reservation("two", "customer-2", "2026-07-01T01:00:00.000Z", "confirmed");
  const unknown = reservation("unknown", "", "2026-08-01T01:00:00.000Z", "confirmed");

  const result = attachPreviousVisits(
    [customerOne, customerTwo, unknown],
    new Date("2026-08-24T00:00:00.000Z"),
  );

  assert.equal(result.find((item) => item.id === "two")?.previousVisitAt, null);
  assert.equal(result.find((item) => item.id === "unknown")?.previousVisitAt, null);
});

test("marks first visits as new, including customers with only canceled bookings", () => {
  const canceled = reservation("canceled", "customer-1", "2026-06-01T01:00:00.000Z", "canceled");
  const first = reservation("first", "customer-1", "2026-09-01T01:00:00.000Z", "confirmed");
  const completedFirst = reservation("completed-first", "customer-2", "2026-08-01T01:00:00.000Z", "visited");
  const result = attachPreviousVisits([canceled, first, completedFirst], new Date("2026-08-24T00:00:00.000Z"));

  assert.equal(isFirstVisitReservation(result[0]), false);
  assert.equal(isFirstVisitReservation(result[1]), true);
  assert.equal(isFirstVisitReservation(result[2]), true);
});

test("elapsed confirmed reservations count as visits while future bookings do not", () => {
  const past = reservation("past", "customer-1", "2026-08-01T01:00:00.000Z", "confirmed");
  const future = reservation("future", "customer-2", "2026-09-01T01:00:00.000Z", "confirmed");
  const returning = reservation("returning", "customer-1", "2026-10-01T01:00:00.000Z", "confirmed");
  const first = reservation("first", "customer-2", "2026-10-01T01:00:00.000Z", "confirmed");
  const result = attachPreviousVisits([past, future, returning, first], new Date("2026-08-24T00:00:00.000Z"));

  assert.equal(isFirstVisitReservation(result[2]), false);
  assert.equal(result[2].previousVisitAt, past.startTime);
  assert.equal(isFirstVisitReservation(result[3]), true);
});

test("preserves legacy last-visit snapshots and chooses the latest valid earlier visit", () => {
  const past = reservation("past", "customer-1", "2026-06-01T01:00:00.000Z", "visited");
  const returning = {
    ...reservation("returning", "customer-1", "2026-09-01T01:00:00.000Z", "confirmed"),
    previousVisitAt: "2026-07-01T01:00:00.000Z",
  };
  const invalid = {
    ...reservation("invalid", "customer-2", "2026-09-01T01:00:00.000Z", "confirmed"),
    previousVisitAt: "2026-10-01T01:00:00.000Z",
  };
  const result = attachPreviousVisits([returning, past, invalid], new Date("2026-08-24T00:00:00.000Z"));

  assert.equal(result[0].previousVisitAt, returning.previousVisitAt);
  assert.equal(isFirstVisitReservation(result[0]), false);
  assert.equal(isFirstVisitReservation(result[2]), true);
});

test("non-cancelled reservations become visited at their finish time", () => {
  const booking = reservation("booking", "customer-1", "2026-10-22T03:30:00.000Z", "confirmed");
  assert.equal(reservationDisplayStatus(booking, new Date("2026-10-22T04:29:59.999Z")), "confirmed");
  assert.equal(reservationDisplayStatus(booking, new Date(booking.finishTime)), "visited");
  assert.equal(reservationDisplayStatus({ ...booking, status: "canceled" }, new Date("2026-10-23T00:00:00Z")), "canceled");
});

test("stored visited flags do not turn future or ongoing reservations into past visits", () => {
  const booking = reservation("booking", "customer-1", "2026-10-22T03:30:00.000Z", "visited");
  assert.equal(reservationDisplayStatus(booking, new Date("2026-10-18T00:00:00Z")), "confirmed");
  assert.equal(reservationDisplayStatus(booking, new Date("2026-10-22T04:00:00Z")), "confirmed");
  assert.equal(reservationDisplayStatus({ ...booking, finishTime: "invalid" }), "confirmed");
});

test("customer counts, last visit and missing karte use elapsed uncancelled bookings", () => {
  const first = reservation("first", "customer-1", "2026-10-01T01:00:00.000Z", "confirmed");
  const last = reservation("last", "customer-1", "2026-10-10T01:00:00.000Z", "confirmed");
  const canceled = reservation("canceled", "customer-1", "2026-10-11T01:00:00.000Z", "canceled");
  const future = reservation("future", "customer-1", "2026-10-22T01:00:00.000Z", "visited");
  const otherCustomer = reservation("other", "customer-2", "2026-10-15T01:00:00.000Z", "confirmed");
  const bookings = [future, canceled, first, otherCustomer, last];
  const now = new Date("2026-10-18T00:00:00Z");
  const summary = customerVisitSummary("customer-1", bookings, [
    { customerId: "customer-1", reservationId: first.id },
  ], now);
  assert.deepEqual(summary, { visits: 2, lastVisit: last.startTime, missingKarte: true });
  assert.equal(customerVisitSummary("customer-1", bookings, [
    { customerId: "customer-1", reservationId: first.id },
    { customerId: "customer-1", reservationId: last.id },
  ], now).missingKarte, false);
});

test("customers with only future bookings have zero visits", () => {
  const booking = reservation("new", "customer-1", "2026-10-22T03:30:00.000Z", "confirmed");
  assert.deepEqual(customerVisitSummary("customer-1", [booking], [], new Date("2026-10-18T00:00:00Z")),
    { visits: 0, lastVisit: undefined, missingKarte: false });
});

test("elapsed confirmed bookings are shown as visited and become the previous visit", () => {
  const past = reservation("past", "customer-1", "2026-10-01T01:00:00.000Z", "confirmed");
  const upcoming = reservation("next", "customer-1", "2026-10-22T01:00:00.000Z", "confirmed");
  const result = attachPreviousVisits([upcoming, past], new Date("2026-10-18T00:00:00Z"));
  assert.equal(result[0].previousVisitAt, past.startTime);
  assert.equal(result[1].status, "visited");
  assert.equal(past.status, "confirmed");
});

test("the same loaded snapshot changes visit status when the clock crosses the finish time", () => {
  const booking = reservation("booking", "customer-1", "2026-10-22T03:30:00.000Z", "confirmed");
  const before = attachPreviousVisits([booking], new Date("2026-10-22T04:29:59Z"));
  const after = attachPreviousVisits([booking], new Date("2026-10-22T04:30:00Z"));
  assert.equal(before[0].status, "confirmed");
  assert.equal(after[0].status, "visited");
  assert.equal(customerVisitSummary("customer-1", [booking], [], new Date(booking.finishTime)).visits, 1);
});
