const defaultCustomerRoute = "/mypage";
const defaultAdminRoute = "/admin";

export function safeCustomerReturnTo(value: string | null | undefined) {
  const path = value?.trim();
  const pathname = path ? safeLocalPathname(path) : null;

  if (!path || !pathname) {
    return defaultCustomerRoute;
  }

  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname.startsWith("/admin")
  ) {
    return defaultCustomerRoute;
  }

  return path;
}

export function isAdminReturnTo(value: string | null | undefined) {
  const path = value?.trim();
  const pathname = path ? safeLocalPathname(path) : null;

  if (!pathname) {
    return false;
  }

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

function safeLocalPathname(path: string) {
  if (!isSafeLocalPath(path)) return null;

  let pathname = pathWithoutQuery(path);
  for (let depth = 0; depth < 4; depth += 1) {
    let decodedPathname: string;
    try {
      decodedPathname = decodeURIComponent(pathname);
    } catch {
      return null;
    }

    if (decodedPathname === pathname) {
      return isSafeLocalPath(pathname) ? pathname : null;
    }
    pathname = decodedPathname;
  }

  return null;
}

function pathWithoutQuery(path: string) {
  return path.split(/[?#]/, 1)[0];
}
