import assert from "node:assert/strict";
import test from "node:test";

import { attachPreviousVisits, isFirstVisitReservation } from "./reservation-history.ts";
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
