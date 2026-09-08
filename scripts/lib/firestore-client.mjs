import { Firestore } from "@google-cloud/firestore";

const clients = new Map();

/** Return a cached Firestore client backed by Application Default Credentials. */
export function getServerFirestore(projectId) {
  if (!projectId) throw new Error("A Google Cloud project ID is required.");
  // These tools use point reads, queries, and writes, never snapshot listeners.
  // REST avoids a stalled gRPC connection in local launch/verification runs.
  if (!clients.has(projectId)) clients.set(projectId, new Firestore({ projectId, preferRest: true }));
  return clients.get(projectId);
}
