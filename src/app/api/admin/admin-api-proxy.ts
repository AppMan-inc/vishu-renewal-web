import "server-only";

const functionsRegion = "asia-northeast2";
const functionName = "adminApi";

export async function proxyAdminApi(request: Request, route = "") {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    return Response.json(
      { message: "Firebase project is not configured." },
      { status: 500 },
    );
  }

  const normalizedRoute = route ? `/${route.replace(/^\/+/, "")}` : "";
  const target =
    `https://${functionsRegion}-${projectId}.cloudfunctions.net/` +
    `${functionName}${normalizedRoute}`;
  const headers = new Headers();
  for (const name of ["authorization", "content-type", "x-request-id"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
  });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
