import type { CustomerReservation } from "./account-data";

export function visibleCustomerReservations(reservations: CustomerReservation[]) {
  const byId = new Map<string, CustomerReservation>();
  for (const reservation of reservations) {
    if (reservation.status === "cancelled" || !byId.has(reservation.id)) {
      byId.set(reservation.id, reservation);
    }
  }
  return [...byId.values()]
    .filter((reservation) => reservation.status !== "cancelled")
    .sort((left, right) => right.startAt.getTime() - left.startAt.getTime());
}
