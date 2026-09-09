#!/usr/bin/env node
import { getServerFirestore } from "./lib/firestore-client.mjs";
import { activateCatalogGeneration } from "./lib/catalog-generation.mjs";
const arg = name => process.argv.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
const project = arg("--project");
const generationId = arg("--generation");
if (!project || !generationId) throw new Error("Specify --project and --generation");
const db = getServerFirestore(project);
const pointer = await db.doc("public_catalog_state/current").get();
const generation = await db.doc(`public_catalog_generations/${generationId}`).get();
if (generation.data()?.status !== "ready") throw new Error("Generation is not verified ready");
const apply = process.argv.includes("--apply");
if (apply && process.env.OFR_CONFIRM_FIRESTORE_PROJECT !== project) throw new Error("Confirm the exact target project");
const expected = arg("--expected-current");
if (apply && expected !== (pointer.data()?.activeGenerationId ?? "legacy")) throw new Error("Pass --expected-current with the reviewed active generation (or legacy)");
const activation = apply ? await activateCatalogGeneration(db, generationId, pointer) : null;
console.log(JSON.stringify({ project, current: pointer.data() ?? null, generationId, generation: generation.data(), activation }, null, 2));
