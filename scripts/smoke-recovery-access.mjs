#!/usr/bin/env node
import assert from "node:assert/strict";
import { initializeApp } from "firebase/app";
import { getFirestore, getDoc, doc, terminate } from "firebase/firestore";
const databaseId = process.argv.find(arg => arg.startsWith("--database="))?.slice(11);
assert(databaseId && databaseId !== "(default)", "Specify the isolated recovery database");
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
assert.equal(projectId, "oflapp-prod");
const app = initializeApp({ projectId, apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY, appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID });
const live = getFirestore(app);
const restored = getFirestore(app, databaseId);
assert((await getDoc(doc(live, "public_collections/batch-6"))).exists(), "Public control read failed");
await assert.rejects(() => getDoc(doc(restored, "public_collections/batch-6")), error => error.code === "permission-denied");
console.log(JSON.stringify({ projectId, databaseId, livePublicControlRead: "PASS", recoveredDatabaseAnonymousRead: "DENIED", result: "PASS" }, null, 2));
await Promise.all([terminate(live), terminate(restored)]);
