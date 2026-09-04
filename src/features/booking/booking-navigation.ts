export function bookingReturnTo(menuId: string) {
  return `/booking?menuId=${encodeURIComponent(menuId)}`;
}

export function bookingLoginHref(menuId: string) {
  return `/login?returnTo=${encodeURIComponent(bookingReturnTo(menuId))}`;
}

export function bookingCompleteHref(reservationId: string) {
  return `/booking/complete?reservationId=${encodeURIComponent(reservationId)}`;
}
