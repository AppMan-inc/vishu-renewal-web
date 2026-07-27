import { getStorage } from "firebase-admin/storage";
import { AdminAuthorizationError, requireAdmin } from "@/features/admin/server/admin-auth";
import { adminLog } from "@/features/admin/server/admin-log";
import { getFirebaseAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  try {
    const session = await requireAdmin(request, requestId);
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      return jsonResponse({ message: "画像ファイルを選択してください。" }, 400, requestId);
    }
    if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
      return jsonResponse({ message: "画像は5MB以下にしてください。" }, 400, requestId);
    }

    const extension = imageTypes[image.type as keyof typeof imageTypes];
    if (!extension) {
      return jsonResponse({ message: "JPEG、PNG、WebP画像を選択してください。" }, 400, requestId);
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    if (!hasExpectedSignature(buffer, image.type)) {
      return jsonResponse({ message: "画像ファイルの形式を確認してください。" }, 400, requestId);
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
    if (!bucketName) throw new Error("Firebase Storage bucket is not configured.");

    const imagePath = `menu-images/${crypto.randomUUID()}.${extension}`;
    const downloadToken = crypto.randomUUID();
    await getStorage(getFirebaseAdminApp()).bucket(bucketName).file(imagePath).save(buffer, {
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        contentType: image.type,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          uploadedBy: session.uid,
        },
      },
    });

    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(imagePath)}?alt=media&token=${encodeURIComponent(downloadToken)}`;
    adminLog("info", "admin-menu-image", "upload_succeeded", {
      imagePath,
      requestId,
      size: image.size,
      uid: session.uid,
    });
    return jsonResponse({ imagePath, imageUrl }, 201, requestId);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return jsonResponse({ message: error.message }, error.status, requestId);
    }
    adminLog("error", "admin-menu-image", "upload_failed", {
      code: (error as { code?: unknown } | null)?.code ?? "unknown",
      errorName: error instanceof Error ? error.name : typeof error,
      requestId,
    });
    return jsonResponse({ message: "画像をアップロードできませんでした。" }, 500, requestId);
  }
}

function hasExpectedSignature(buffer: Buffer, contentType: string) {
  if (contentType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

function requestIdFor(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim();
  return requestId && /^[A-Za-z0-9._:-]{1,100}$/.test(requestId)
    ? requestId
    : crypto.randomUUID();
}

function jsonResponse(body: Record<string, unknown>, status: number, requestId: string) {
  return Response.json(
    { ...body, requestId },
    { status, headers: { "X-Request-Id": requestId } },
  );
}
