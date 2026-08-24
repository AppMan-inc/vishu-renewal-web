import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { z } from "zod";

const clientConfigSchema = z.object({
  environment: z.enum(["dev", "prod"]),
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1),
});

function getClientConfig() {
  const result = clientConfigSchema.safeParse({
    environment: process.env.NEXT_PUBLIC_VISHU_ENV,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });

  if (!result.success) {
    throw new Error(
      "Firebase client configuration is missing. Copy .env.example to .env.local and fill in the Web app values.",
    );
  }

  const expectedProjectId =
    result.data.environment === "dev"
      ? "salon-vishu2-dev-30830"
      : "salon-vishu";

  if (result.data.projectId !== expectedProjectId) {
    throw new Error(
      `Firebase project '${result.data.projectId}' does not match the '${result.data.environment}' environment.`,
    );
  }

  return result.data;
}

export function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(getClientConfig());
}

export const firebaseAuth = () => getAuth(getFirebaseApp());
