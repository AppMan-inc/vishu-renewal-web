import "client-only";

import { getFunctions } from "firebase/functions";
import { getFirebaseApp } from "./client";

export const firebaseFunctions = () =>
  getFunctions(getFirebaseApp(), "asia-northeast2");
