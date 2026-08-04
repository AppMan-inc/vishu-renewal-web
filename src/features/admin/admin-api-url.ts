const defaultFunctionsRegion = "asia-northeast2";
const adminFunctionName = "adminApi";

export function adminApiUrl(
  projectId: string,
  configuredBaseUrl: string | undefined,
  route = "",
  hostname?: string,
) {
  const override = configuredBaseUrl?.trim().replace(/\/+$/, "");
  const normalizedRoute = route ? `/${route.replace(/^\/+/, "")}` : "";
  if (!override && isLocalHostname(hostname)) {
    return `/api/admin${normalizedRoute}`;
  }
  const baseUrl = override || functionsAdminApiUrl(projectId);
  return `${baseUrl}${normalizedRoute}`;
}

function isLocalHostname(hostname: string | undefined) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function functionsAdminApiUrl(projectId: string) {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId) {
    throw new Error("Firebase project ID is not configured.");
  }
  return `https://${defaultFunctionsRegion}-${normalizedProjectId}.cloudfunctions.net/${adminFunctionName}`;
}
