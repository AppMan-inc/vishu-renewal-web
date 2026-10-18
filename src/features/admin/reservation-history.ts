import type { AdminReservation, KarteEntry, ReservationStatus } from "./types.ts";

export function reservationDisplayStatus(
  reservation: Pick<AdminReservation, "status" | "finishTime">,
  now = new Date(),
): ReservationStatus {
  if (reservation.status === "canceled") return "canceled";
  return new Date(reservation.finishTime).getTime() <= now.getTime()
    ? "visited" : "confirmed";
}

export function customerVisitSummary(
  customerId: string,
  reservations: AdminReservation[],
  entries: Pick<KarteEntry, "customerId" | "reservationId">[],
  now = new Date(),
) {
  const visits = reservations.filter((item) =>
    item.customerId === customerId && reservationDisplayStatus(item, now) === "visited"
  ).sort((a, b) => b.startTime.localeCompare(a.startTime));
  const entryIds = new Set(entries.filter((item) => item.customerId === customerId)
    .map((item) => item.reservationId));
  return {
    visits: visits.length,
    lastVisit: visits[0]?.startTime,
    missingKarte: visits.some((item) => !entryIds.has(item.id)),
  };
}

export function attachPreviousVisits(
  reservations: AdminReservation[],
  now = new Date(),
) {
  const displayed = reservations.map((reservation) => ({
    ...reservation,
    status: reservationDisplayStatus(reservation, now),
  }));
  const chronological = [...displayed].sort((a, b) => {
    const timeComparison = a.startTime.localeCompare(b.startTime);
    return timeComparison || a.sourcePath.localeCompare(b.sourcePath);
  });
  const previousBySourcePath = new Map<string, string | null>();
  const latestVisitByCustomer = new Map<string, string>();
  const nowTime = now.getTime();

  for (let index = 0; index < chronological.length;) {
    const startTime = chronological[index].startTime;
    const simultaneous: AdminReservation[] = [];
    while (
      index < chronological.length &&
      chronological[index].startTime === startTime
    ) {
      simultaneous.push(chronological[index]);
      index += 1;
    }

    for (const reservation of simultaneous) {
      previousBySourcePath.set(
        reservation.sourcePath,
        reservation.customerId
          ? latestVisitByCustomer.get(reservation.customerId) ?? null
          : null,
      );
    }

    if (new Date(startTime).getTime() > nowTime) continue;
    for (const reservation of simultaneous) {
      if (reservation.customerId && reservation.status === "visited") {
        latestVisitByCustomer.set(reservation.customerId, startTime);
      }
    }
  }

  return displayed.map((reservation) => ({
    ...reservation,
    previousVisitAt: previousBySourcePath.get(reservation.sourcePath) ?? null,
  }));
}
