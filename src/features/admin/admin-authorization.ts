export function isAdminDocumentForUid(
  data: Record<string, unknown> | undefined,
  uid: string,
) {
  return typeof data?.uid === "string" && data.uid.trim() === uid;
}
