export function bookingReturnTo(menuId: string) {
  return `/booking?menuId=${encodeURIComponent(menuId)}`;
}

export function bookingLoginHref(menuId: string) {
  return `/login?returnTo=${encodeURIComponent(bookingReturnTo(menuId))}`;
}
