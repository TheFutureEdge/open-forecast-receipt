#!/usr/bin/env node
import assert from "node:assert/strict";
import { initializeApp } from "firebase/app";
import { getFirestore, getDoc, getDocs, doc, collection, query, orderBy, limit, terminate } from "firebase/firestore";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
assert(["oflapp-staging", "oflapp-prod"].includes(projectId));
const requested = process.argv.find(arg => arg.startsWith("--generation="))?.slice(13);
const app = initializeApp({ projectId, apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY, appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const state = await getDoc(doc(db, "public_catalog_state/current"));
const generationId = requested || state.data()?.activeGenerationId;
assert(generationId, "No generation requested or active");
const prefix = `public_catalog_generations/${generationId}`;
const [manifest, stats, member] = await Promise.all([
  getDoc(doc(db, `${prefix}/public_collection_catalogs/batch-6`)),
  getDoc(doc(db, `${prefix}/public_library_stats/summary`)),
  getDoc(doc(db, "public_collection_entities/batch-6__pepsi")),
]);
assert.equal(manifest.data().manifest.receiptCount, 4511);
assert.match(manifest.data().manifest.presentation.title, /4,511/);
assert.equal(stats.data().receiptCount, 4511);
const ledgerPath = `${prefix}/public_entity_forecast_ledgers/${member.data().entityId}/parts`;
const parts = await getDocs(query(collection(db, ledgerPath), orderBy("partNumber", "desc"), limit(2)));
assert(parts.size > 0 && parts.size <= 2);
const record = parts.docs[0].data().forecasts[0];
const revision = await getDoc(doc(db, `public_forecast_revisions/${record.forecastPublicId}`));
assert.equal(revision.data().receiptDigest, record.receiptDigest);
const denied = async (name, action) => {
  await assert.rejects(action, error => error.code === "permission-denied", name);
};
await denied("Unbounded parts query", () => getDocs(collection(db, ledgerPath)));
await denied("Catalog collection scan", () => getDocs(collection(db, `${prefix}/public_collection_catalogs`)));
await denied("Generation metadata", () => getDoc(doc(db, prefix)));
await denied("Unpublished generation", () => getDoc(doc(db, "public_catalog_generations/not-published/public_library_stats/summary")));
await denied("Private namespace", () => getDocs(collection(db, "proof_jobs")));
await denied("Raw receipt scan", () => getDocs(collection(db, "public_receipts")));
console.log(JSON.stringify({ projectId, generationId, activeGenerationId: state.data()?.activeGenerationId ?? null,
  forecastCount: stats.data().receiptCount, ledgerPartsRead: parts.size, permissionChecks: 6, result: "PASS" }, null, 2));
await terminate(db);
