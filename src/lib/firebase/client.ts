import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

let firestore: Firestore | undefined;

/**
 * Return the public, read-only Firestore client used by the Library UI.
 *
 * App Hosting supplies FIREBASE_WEBAPP_CONFIG and the Firebase SDK consumes it
 * when initializeApp() is called without arguments. Explicit NEXT_PUBLIC values
 * remain supported only for local development against staging.
 */
export function getLibraryFirestore(): Firestore {
  if (firestore) return firestore;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const app = getApps().length > 0
    ? getApp()
    : projectId && apiKey && authDomain && appId ? initializeApp({
        apiKey,
        authDomain,
        projectId,
        appId,
      }) : initializeApp();

  firestore = getFirestore(app);
  return firestore;
}
