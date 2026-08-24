import assert from "node:assert/strict";
import test from "node:test";

import { attachPreviousVisits } from "./reservation-history.ts";
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
