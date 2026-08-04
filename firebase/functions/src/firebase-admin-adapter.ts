import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getFirebaseAdminApp() {
  return getApps().length > 0 ? getApp() : initializeApp();
}

export const adminFirestore = () => getFirestore(getFirebaseAdminApp());
export const adminAuth = () => getAuth(getFirebaseAdminApp());
