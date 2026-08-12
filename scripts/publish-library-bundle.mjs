import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  planPublicationBundle,
  publishPlan,
} from "./lib/library-publisher.mjs";

const ROOT = resolve(import.meta.dirname, "..");

function argumentValue(name) {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const input = argumentValue("--input");
const projectId = argumentValue("--project") || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const apply = process.argv.includes("--apply");
assert(input, "Pass --input=/absolute/or/repository-relative/publication-bundle.json");

const [bundle, schema] = await Promise.all([
  readFile(resolve(process.cwd(), input), "utf8").then(JSON.parse),
  readFile(resolve(ROOT, "schema/open_forecast_receipt_v0_1.schema.json"), "utf8").then(JSON.parse),
]);
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const plan = planPublicationBundle(bundle, (document) => {
  const valid = validate(document);
  return { valid, errors: valid ? [] : (validate.errors || []).map((error) => `${error.instancePath || "/"} ${error.message}`) };
});

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  projectId: projectId || null,
  bundleDigest: plan.bundleDigest,
  collectionId: plan.collectionId,
  documentCount: plan.documents.length,
  counts: plan.counts,
}, null, 2));

if (!apply) {
  console.log("Dry run complete. No Firestore connection or write was made.");
  process.exit(0);
}

assert(projectId, "Apply mode requires --project=<project-id>.");
assert(
  process.env.OFR_CONFIRM_FIRESTORE_PROJECT === projectId,
  "Set OFR_CONFIRM_FIRESTORE_PROJECT to the exact target project ID before applying.",
);
const result = await publishPlan(plan, projectId);
console.log(JSON.stringify({ projectId, ...result }, null, 2));
