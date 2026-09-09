import "server-only";

import { Firestore } from "@google-cloud/firestore";

let firestore: Firestore | undefined;

/** Return the server-only Firestore client used by Next.js SSR and metadata. */
export function getLibraryServerFirestore(): Firestore {
  if (firestore) return firestore;

  let firebaseConfigProjectId: string | undefined;
  try {
    firebaseConfigProjectId = process.env.FIREBASE_CONFIG
      ? JSON.parse(process.env.FIREBASE_CONFIG).projectId
      : undefined;
  } catch {
    throw new Error("FIREBASE_CONFIG is not valid JSON");
  }
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || firebaseConfigProjectId
    || process.env.GOOGLE_CLOUD_PROJECT
    || process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error("No Firebase project is available. Use App Hosting FIREBASE_CONFIG or set NEXT_PUBLIC_FIREBASE_PROJECT_ID locally.");
  }

  // The Google Cloud client uses Application Default Credentials locally and
  // the App Hosting service identity after deployment. OFL only needs
  // Firestore, so avoid pulling the broader Firebase Admin surface into SSR.
  // SSR uses finite reads, not realtime listeners. REST also avoids loading
  // the gRPC transport for the public request path.
  firestore = new Firestore({ projectId, databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)", preferRest: true });
  return firestore;
}
