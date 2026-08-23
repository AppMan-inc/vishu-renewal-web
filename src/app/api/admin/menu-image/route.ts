import { proxyAdminApi } from "../admin-api-proxy";

export const runtime = "nodejs";

export function POST(request: Request) {
  return proxyAdminApi(request, "menu-image");
}
