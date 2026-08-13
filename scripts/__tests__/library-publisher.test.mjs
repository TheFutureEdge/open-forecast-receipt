import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalize } from "json-canonicalize";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  planPublicationBundle,
  PUBLICATION_BUNDLE_VERSION,
} from "../lib/library-publisher.mjs";

const ROOT = resolve(import.meta.dirname, "../..");

async function readJson(path) {
  return JSON.parse(await readFile(resolve(ROOT, path), "utf8"));
}

const [receipt, projection, schema] = await Promise.all([
  readJson("src/data/fixtures/pepsi/ray-ofr.json"),
  readJson("src/data/fixtures/pepsi/ray-projection.json"),
  readJson("schema/open_forecast_receipt_v0_1.schema.json"),
]);
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const validateReceipt = (document) => ({
  valid: validate(document),
  errors: (validate.errors || []).map((error) => `${error.instancePath} ${error.message}`),
});

function bundleEntry() {
  return {
    sortOrder: 0,
    entitySortOrder: 0,
    requestBlockchainProof: true,
    entityPresentation: {
      routeSlug: "pepsi",
      aliases: ["pep"],
      displaySymbol: "PEP",
      marketIdentifier: "PEP:XNAS",
      iconKey: "pepsi",
    },
    receipt: structuredClone(receipt),
    projection: structuredClone(projection),
  };
}

function publicationBundle() {
  return {
    bundleVersion: PUBLICATION_BUNDLE_VERSION,
    createdAt: "2026-08-12T12:00:00Z",
    proofNetwork: "base-sepolia",
    collection: {
      collectionId: "publisher-test",
      label: "Publisher test",
      description: "Deterministic publisher test bundle",
      publishedAt: "2026-08-12T12:00:00Z",
    },
    entries: [bundleEntry()],
  };
}

function reseal(entry) {
  const digest = createHash("sha256")
    .update(canonicalize(entry.receipt.receiptPayload), "utf8")
    .digest("hex");
  entry.receipt.proofEnvelope.payloadDigestSha256 = digest;
  entry.projection.encodedFields.receiptDigest = `0x${digest}`;
}

describe("OFL publication bundle planner", () => {
  it("plans immutable receipts, mutable collection indexes, and one private proof job", () => {
    const plan = planPublicationBundle(publicationBundle(), validateReceipt);
    expect(plan.counts).toEqual({
      entities: 1,
      forecasts: 1,
      receipts: 1,
      selectedProofs: 1,
      verifiedProofs: 0,
    });
    expect(plan.documents.some((document) => document.collectionName === "public_receipts")).toBe(true);
    expect(plan.documents.some((document) => document.collectionName === "proof_jobs")).toBe(true);
    const forecast = plan.documents.find((document) => document.collectionName === "public_forecasts");
    expect(forecast.value.forecaster.displayName).toBe("Ray Dalio AI on Gemini 3.1 Pro");
    expect(forecast.value.forecaster.description).toBe("The Strategist · RESEARCHER");
    expect(forecast.value.chainStatus).toBe("not_issued");
    const entity = plan.documents.find((document) => document.collectionName === "public_collection_entities");
    expect(entity.value.loadedCount).toBe(1);
    expect(entity.writeMode).toBe("mutable_current");
    expect(plan.documents.some((document) => document.collectionName === "public_entities")).toBe(false);
  });

  it("rejects a changed forecast value whose sealed digest was not updated", () => {
    const bundle = publicationBundle();
    bundle.entries[0].receipt.receiptPayload.forecast.prediction.points[0].value = -399;
    expect(() => planPublicationBundle(bundle, validateReceipt)).toThrow("payload digest mismatch");
  });

  it("rejects duplicate forecast IDs and digests in one bundle", () => {
    const bundle = publicationBundle();
    bundle.entries.push(bundleEntry());
    expect(() => planPublicationBundle(bundle, validateReceipt)).toThrow(/Duplicate receipt digest|Duplicate forecast ID/);
  });

  it("rejects more than ten reviewers before publication", () => {
    const bundle = publicationBundle();
    const forecast = bundle.entries[0].receipt.receiptPayload.forecast;
    forecast.review = {
      status: "reviewed",
      reviewers: Array.from({ length: 11 }, (_, index) => ({
        type: "human",
        name: `Reviewer ${index}`,
        reviewType: "quality_review",
      })),
    };
    reseal(bundle.entries[0]);
    const permissiveValidator = () => ({ valid: true, errors: [] });
    expect(() => planPublicationBundle(bundle, permissiveValidator)).toThrow("more than 10 reviewers");
  });
});
