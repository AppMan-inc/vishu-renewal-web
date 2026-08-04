const defaultFunctionsRegion = "asia-northeast2";
const adminFunctionName = "adminApi";

export function adminApiUrl(
  projectId: string,
  configuredBaseUrl: string | undefined,
  route = "",
) {
  const override = configuredBaseUrl?.trim().replace(/\/+$/, "");
  const baseUrl = override || functionsAdminApiUrl(projectId);
  const normalizedRoute = route ? `/${route.replace(/^\/+/, "")}` : "";
  return `${baseUrl}${normalizedRoute}`;
}

function functionsAdminApiUrl(projectId: string) {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId) {
    throw new Error("Firebase project ID is not configured.");
  }
  return `https://${defaultFunctionsRegion}-${normalizedProjectId}.cloudfunctions.net/${adminFunctionName}`;
}
