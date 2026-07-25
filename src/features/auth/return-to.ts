const defaultCustomerRoute = "/booking";
const defaultAdminRoute = "/admin";

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

export function safeAdminReturnTo(value: string | null | undefined) {
  const path = value?.trim();
  const isAdminPath = path === "/admin" || path?.startsWith("/admin/");

  if (
    !path ||
    !isAdminPath ||
    path.startsWith("//") ||
    path.startsWith("/admin/login")
  ) {
    return defaultAdminRoute;
  }

  return path;
}
