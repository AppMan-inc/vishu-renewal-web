const defaultCustomerRoute = "/mypage";
const defaultAdminRoute = "/admin";

export function safeCustomerReturnTo(value: string | null | undefined) {
  const path = value?.trim();

  if (!path || !isSafeLocalPath(path)) {
    return defaultCustomerRoute;
  }

  const pathname = pathWithoutQuery(path);

  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/admin")
  ) {
    return defaultCustomerRoute;
  }

  return path;
}

export function isAdminReturnTo(value: string | null | undefined) {
  const path = value?.trim();

  if (!path || !isSafeLocalPath(path)) {
    return false;
  }

  const pathname = pathWithoutQuery(path);

  return (
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    pathname !== "/admin/login" &&
    !pathname.startsWith("/admin/login/")
  );
}

export function safeAdminReturnTo(value: string | null | undefined) {
  const path = value?.trim();

  if (!path || !isAdminReturnTo(path)) {
    return defaultAdminRoute;
  }

  return path;
}

export function loginIntent(value: string | null | undefined) {
  if (isAdminReturnTo(value)) {
    return {
      destination: safeAdminReturnTo(value),
      requiresAdminAuthorization: true,
    } as const;
  }

  return {
    destination: safeCustomerReturnTo(value),
    requiresAdminAuthorization: false,
  } as const;
}

function isSafeLocalPath(path: string) {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !/[\\\u0000-\u001f\u007f]/.test(path)
  );
}

function pathWithoutQuery(path: string) {
  return path.split(/[?#]/, 1)[0];
}
