import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

let firestore: Firestore | undefined;

/**
 * Return the public, read-only Firestore client used by the Library UI.
 *
 * Configuration comes from Vite environment variables for the explicitly
 * selected Firebase environment. The browser has anonymous read-only access;
 * publishers use controlled server credentials and never the web client.
 */
export function getLibraryFirestore(): Firestore {
  if (firestore) return firestore;

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (!projectId || !apiKey || !authDomain || !appId) {
    throw new Error(
      "Open Forecast Library is not configured. Set VITE_FIREBASE_PROJECT_ID and the public Firebase web configuration.",
    );
  }

  const app = getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey,
        authDomain,
        projectId,
        appId,
      });

  firestore = getFirestore(app);
  return firestore;
}
