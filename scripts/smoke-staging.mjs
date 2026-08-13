import process from "node:process";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from "firebase/firestore";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const app = initializeApp({
  projectId,
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const collectionSnapshot = await getDoc(doc(db, "public_collections", "batch-6"));
assert(collectionSnapshot.exists(), "Public collection batch-6 is not readable");
const collectionRecord = collectionSnapshot.data();
assert(collectionRecord.entityCount === 5, `Expected 5 entities, received ${collectionRecord.entityCount}`);
assert(collectionRecord.receiptCount === 60, `Expected 60 receipts, received ${collectionRecord.receiptCount}`);

const entitySnapshot = await getDoc(doc(db, "public_collection_entities", "batch-6__pepsi"));
assert(entitySnapshot.exists(), "PepsiCo collection entity is not readable");
const entityRecord = entitySnapshot.data();
const forecastSnapshot = await getDocs(query(
  collection(db, "public_forecasts"),
  where("collectionId", "==", "batch-6"),
  where("entityId", "==", entityRecord.entityId),
));
assert(forecastSnapshot.size === 12, `Expected 12 PepsiCo forecasts, received ${forecastSnapshot.size}`);

const receiptDigest = forecastSnapshot.docs[0].data().receiptDigest;
const receiptSnapshot = await getDoc(doc(db, "public_receipts", receiptDigest));
assert(receiptSnapshot.exists(), "Direct receipt lookup is not readable");

async function expectPermissionDenied(label, operation) {
  try {
    await operation();
    throw new Error(`${label} unexpectedly succeeded`);
  } catch (error) {
    if (error?.code !== "permission-denied") throw error;
  }
}

await expectPermissionDenied("Public receipt collection scan", () => getDocs(collection(db, "public_receipts")));
await expectPermissionDenied("Private proof job scan", () => getDocs(collection(db, "proof_jobs")));
await expectPermissionDenied("Anonymous browser write", () => setDoc(
  doc(db, "public_collections", "anonymous-write-must-fail"),
  { attemptedAt: new Date().toISOString() },
));

console.log(JSON.stringify({
  projectId,
  collectionId: "batch-6",
  entities: collectionRecord.entityCount,
  receipts: collectionRecord.receiptCount,
  pepsiForecasts: forecastSnapshot.size,
  directReceiptRead: true,
  receiptCollectionScanDenied: true,
  privateJobReadDenied: true,
  anonymousWriteDenied: true,
}, null, 2));
