const defaultCustomerRoute = "/mypage";
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

export function isAdminReturnTo(value: string | null | undefined) {
  const path = value?.trim();

  if (!path) {
    return false;
  }

  return (
    (path === "/admin" || path?.startsWith("/admin/")) &&
    !path.startsWith("//") &&
    !path.startsWith("/admin/login")
  );
}

export function safeAdminReturnTo(value: string | null | undefined) {
  const path = value?.trim();

  if (!path || !isAdminReturnTo(path)) {
    return defaultAdminRoute;
  }

  return path;
}
