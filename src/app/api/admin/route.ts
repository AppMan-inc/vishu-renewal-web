import { AdminAuthorizationError, requireAdmin } from "@/features/admin/server/admin-auth";
import {
  adminMutationSchema,
  applyAdminMutation,
  loadAdminSnapshot,
} from "@/features/admin/server/admin-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    return Response.json(await loadAdminSnapshot(session));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    const body = adminMutationSchema.safeParse(await request.json());
    if (!body.success) {
      return Response.json(
        { message: "入力内容を確認してください。", issues: body.error.issues },
        { status: 400 },
      );
    }
    await applyAdminMutation(body.data, session);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) {
    return Response.json({ message: error.message }, { status: error.status });
  }
  console.error("Admin API failed", error);
  return Response.json(
    { message: error instanceof Error ? error.message : "管理データの処理に失敗しました。" },
    { status: 500 },
  );
}
