import type { AdminReservation } from "./types.ts";

export function attachPreviousVisits(
  reservations: AdminReservation[],
  now = new Date(),
) {
  const chronological = [...reservations].sort((a, b) => {
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

  return reservations.map((reservation) => ({
    ...reservation,
    previousVisitAt: previousBySourcePath.get(reservation.sourcePath) ?? null,
  }));
}
