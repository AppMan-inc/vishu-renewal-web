import { proxyAdminApi } from "./admin-api-proxy";

export const runtime = "nodejs";

export function GET(request: Request) {
  return proxyAdminApi(request);
}

export function POST(request: Request) {
  return proxyAdminApi(request);
}
