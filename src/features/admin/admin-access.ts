// Keep this allow-list aligned with AppEnvironment.firebaseAdminUids in the
// Flutter app. Firebase Auth UIDs are identifiers, not authentication secrets.
export const appAdminUids = new Set(["FQNtPf0iDcMpKh98F47Q4if0tXp1"]);

export function isAppAdminUid(uid: string | null | undefined) {
  return uid != null && appAdminUids.has(uid);
}
