import "server-only";

type AdminLogLevel = "error" | "info" | "warn";

export function adminLog(
  level: AdminLogLevel,
  scope: "admin-auth" | "admin-route" | "admin-session",
  event: string,
  details: Record<string, unknown>,
) {
  console[level](`[${scope}] ${event} ${JSON.stringify(details)}`);
}
