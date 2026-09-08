import process from "node:process";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
assert(projectId === "oflapp-staging", "This smoke test is restricted to oflapp-staging");
const app = initializeApp({
  projectId,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const collectionSnapshot = await getDoc(doc(db, "public_collections", "batch-6"));
assert(collectionSnapshot.exists(), "Public collection batch-6 is not readable");
const collectionRecord = collectionSnapshot.data();
assert(collectionRecord.entityCount === 376, `Expected 376 public subjects, received ${collectionRecord.entityCount}`);
assert(collectionRecord.receiptCount === 4511, `Expected 4511 receipts, received ${collectionRecord.receiptCount}`);

const entitySnapshot = await getDoc(doc(db, "public_collection_entities", "batch-6__pepsi"));
assert(entitySnapshot.exists(), "PepsiCo collection entity is not readable");
const entityRecord = entitySnapshot.data();
const catalogSnapshot = await getDoc(doc(db, "public_entity_forecast_catalogs", `batch-6__${entityRecord.entityId}`));
assert(catalogSnapshot.exists(), "PepsiCo bounded forecast catalog has not been materialized");
const forecasts = catalogSnapshot.data().forecasts;
assert(forecasts.length === 12, `Expected 12 PepsiCo forecasts, received ${forecasts.length}`);

const { receiptDigest, forecastPublicId } = forecasts[0];
assert(forecastPublicId, "Stable public forecast identity has not been materialized");
const receiptSnapshot = await getDoc(doc(db, "public_receipts", receiptDigest));
assert(receiptSnapshot.exists(), "Direct receipt lookup is not readable");
const [forecastResolver, receiptResolver, stats, ledger] = await Promise.all([
  getDoc(doc(db, "public_forecast_resolvers", forecastPublicId)),
  getDoc(doc(db, "public_receipt_resolvers", receiptDigest)),
  getDoc(doc(db, "public_library_stats", "summary")),
  getDocs(query(collection(db, "public_entity_forecast_ledgers", entityRecord.entityId, "parts"), orderBy("partNumber", "desc"), limit(2))),
]);
assert(forecastResolver.exists() && receiptResolver.exists(), "Canonical forecast/receipt resolvers are missing");
assert(forecastResolver.data().canonicalPath === receiptResolver.data().canonicalPath, "Resolvers disagree on the canonical forecast URL");
assert(stats.exists() && stats.data().receiptCount === 4511 && stats.data().forecastSubjectCount === 376, "Landing statistics disagree with Batch 6");
assert(!ledger.empty && ledger.size <= 2, "Bounded ledger pagination failed");

async function expectPermissionDenied(label, operation) {
  try {
    await operation();
    throw new Error(`${label} unexpectedly succeeded`);
  } catch (error) {
    if (error?.code !== "permission-denied") throw error;
  }
}

await expectPermissionDenied("Public receipt collection scan", () => getDocs(collection(db, "public_receipts")));
await expectPermissionDenied("Public forecast collection scan", () => getDocs(collection(db, "public_forecasts")));
await expectPermissionDenied("Unbounded ledger scan", () => getDocs(collection(db, "public_entity_forecast_ledgers", entityRecord.entityId, "parts")));
await expectPermissionDenied("Private proof job scan", () => getDocs(collection(db, "proof_jobs")));
await expectPermissionDenied("Anonymous browser write", () => setDoc(
  // If rules regress, an identical rewrite avoids leaving a spurious record.
  doc(db, "public_collections", "batch-6"),
  collectionRecord,
));

console.log(JSON.stringify({
  projectId,
  collectionId: "batch-6",
  entities: collectionRecord.entityCount,
  receipts: collectionRecord.receiptCount,
  pepsiForecasts: forecasts.length,
  canonicalResolversAgree: true,
  ledgerPartsRead: ledger.size,
  directReceiptRead: true,
  receiptCollectionScanDenied: true,
  forecastCollectionScanDenied: true,
  unboundedLedgerScanDenied: true,
  privateJobReadDenied: true,
  anonymousWriteDenied: true,
}, null, 2));
