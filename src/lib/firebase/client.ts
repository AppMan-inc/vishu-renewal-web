import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { z } from "zod";

const clientConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1),
});

function getClientConfig() {
  const result = clientConfigSchema.safeParse({
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

  return result.data;
}

export function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(getClientConfig());
}

export const firebaseAuth = () => getAuth(getFirebaseApp());
export const firestore = () => getFirestore(getFirebaseApp());
export const firebaseStorage = () => getStorage(getFirebaseApp());
