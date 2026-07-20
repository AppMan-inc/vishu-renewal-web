const defaultCustomerRoute = "/booking";

export function safeCustomerReturnTo(value: string | null | undefined) {
  const path = value?.trim();

  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/admin")
  ) {
    return defaultCustomerRoute;
  }

  return path;
}
