import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";

const adminConfigSchema = z.object({
  environment: z.enum(["dev", "prod"]),
  projectId: z.string().min(1),
  clientEmail: z.email(),
  privateKey: z.string().min(1),
});

function getAdminConfig() {
  const result = adminConfigSchema.safeParse({
    environment: process.env.VISHU_ENV,
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  });

  if (!result.success) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  const expectedProjectId =
    result.data.environment === "dev"
      ? "salon-vishu2-dev-30830"
      : "salon-vishu";

  if (result.data.projectId !== expectedProjectId) {
    throw new Error(
      `Firebase Admin project '${result.data.projectId}' does not match the '${result.data.environment}' environment.`,
    );
  }

  return result.data;
}

export function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const config = getAdminConfig();
  return initializeApp({
    credential: cert(config),
    projectId: config.projectId,
  });
}

export const adminAuth = () => getAuth(getFirebaseAdminApp());
export const adminFirestore = () => getFirestore(getFirebaseAdminApp());
