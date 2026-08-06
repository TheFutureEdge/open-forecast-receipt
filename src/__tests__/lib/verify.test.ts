import { describe, it, expect } from "vitest";
import { canonicalizeJson, extractReceiptPayload } from "../../lib/crypto/canonicalize";
import { sha256 } from "../../lib/crypto/hash";
import { validateSchema } from "../../lib/schema/validate";
import rayOfr from "../../data/fixtures/pepsi/ray-ofr.json";
import rayProjection from "../../data/fixtures/pepsi/ray-projection.json";
import batchManifest from "../../data/fixtures/batch6-manifest.json";
import { fixtureCatalog, loadFixture } from "../../data/fixtures/catalog";

describe("canonicalize + hash — Ray payload digest regression", () => {
  it("computes the canonical receiptPayload digest", async () => {
    const doc = { ...rayOfr } as Record<string, unknown>;
    const payload = extractReceiptPayload(doc);
    const canon = canonicalizeJson(payload);
    const digest = await sha256(canon);

    expect(digest).toBe(rayOfr.proofEnvelope.payloadDigestSha256);
    expect(digest).toBe("85e82d474841f0497fb7f6fcb0a7fec7ce808de9779ff69eff32a6b6560ea4a5");
  });

  it("does not change when proof metadata changes", async () => {
    const modifiedEnvelope = structuredClone(rayOfr);
    modifiedEnvelope.proofEnvelope.proofs.push({
      type: "eas_attestation",
      status: "planned",
    });
    const originalDigest = await sha256(canonicalizeJson(extractReceiptPayload(rayOfr)));
    const modifiedDigest = await sha256(canonicalizeJson(extractReceiptPayload(modifiedEnvelope)));
    expect(modifiedDigest).toBe(originalDigest);
  });
});

describe("validateSchema", () => {
  it("passes valid canonical Ray OFR", () => {
    const result = validateSchema(rayOfr);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails on missing required field", () => {
    const doc = { ...rayOfr, $schema: undefined };
    const result = validateSchema(doc);
    expect(result.valid).toBe(false);
  });

  it("fails on additionalProperties", () => {
    const doc = { ...rayOfr, extraField: "should not be here" };
    const result = validateSchema(doc);
    expect(result.valid).toBe(false);
  });
});

describe("basisPoints", () => {
  it("converts bps to percent correctly", async () => {
    const { bpsToPercent } = await import("../../lib/convert/basisPoints");
    expect(bpsToPercent(-400)).toBe("-4.00%");
    expect(bpsToPercent(200)).toBe("+2.00%");
    expect(bpsToPercent(0)).toBe("0.00%");
    expect(bpsToPercent(-300)).toBe("-3.00%");
  });
});

describe("path reconstruction — canonical PepsiCo/Ray fixture", () => {
  it("reconstructs 20 steps with correct terminal ~180.61", async () => {
    const { reconstructPath } = await import("../../lib/path/reconstruct");

    const anchorValueMicros = rayOfr.receiptPayload.forecast.anchor.valueScaled;
    const anchorAt = rayOfr.receiptPayload.forecast.temporal.anchorAt;
    const cadenceMonths = rayOfr.receiptPayload.forecast.temporal.cadence.value;
    const pointCount = rayOfr.receiptPayload.forecast.temporal.cadence.count;
    const stepReturnBps = rayOfr.receiptPayload.forecast.prediction.points.map((p) => p.value).join(",");

    const result = reconstructPath(
      anchorValueMicros,
      anchorAt,
      cadenceMonths,
      pointCount,
      stepReturnBps
    );

    expect(result.steps).toHaveLength(20);
    expect(result.anchorValue).toBe(144.22);

    // Terminal price must match the projection's derived value: ~180.6052
    expect(result.terminalPrice).toBeGreaterThan(175);
    expect(result.terminalPrice).toBeLessThan(185);

    // First two steps: -400bps, -300bps
    expect(result.steps[0].stepReturnBps).toBe(-400);
    expect(result.steps[0].stepReturnPercent).toBe("-4.00%");
    expect(result.steps[1].stepReturnBps).toBe(-300);
    expect(result.steps[1].stepReturnPercent).toBe("-3.00%");

    // Anchor date is 2026-07-02
    expect(result.steps[0].validAt).toContain("2026-10");
  });

  it("regression: stepReturnBps starts with -400,-300", async () => {
    const steps = rayOfr.receiptPayload.forecast.prediction.points.map((p) => p.value);
    expect(steps[0]).toBe(-400);
    expect(steps[1]).toBe(-300);
    expect(steps).toHaveLength(20);
  });

  it("regression: runNumber=6, revision=2", () => {
    expect(rayOfr.receiptPayload.forecast.run.runNumber).toBe(6);
    expect(rayOfr.receiptPayload.forecast.run.revision).toBe(2);
  });

  it("regression: issuanceMode is retrospective", () => {
    expect(rayOfr.receiptPayload.receipt.issuanceMode).toBe("retrospective");
  });

  it("regression: model is Gemini 3.1 Pro", () => {
    expect(rayOfr.receiptPayload.forecast.forecaster.model?.name).toBe("Gemini 3.1 Pro");
    expect(rayOfr.receiptPayload.forecast.forecaster.model?.provider).toBe("Google");
  });

  it("regression: corrected researcher timestamp is preserved", () => {
    expect(rayOfr.receiptPayload.forecast.temporal.forecastCreatedAt).toBe(
      "2026-07-05T14:48:47.049183Z"
    );
    expect(rayProjection.encodedFields.forecastCreatedAt).toBe(1783262927);
  });

  it("regression: temporal provenance distinguishes model, context, search, and generation", () => {
    const temporal = rayOfr.receiptPayload.provenance.temporal;
    expect(temporal.baseModelKnowledge.cutoffAt).toBe("2025-01-31T23:59:59Z");
    expect(temporal.suppliedContext.captureStatus).toBe("reconstructed_backfill");
    expect(temporal.acquiredEvidence.webSearch.configured).toBe(true);
    expect(temporal.acquiredEvidence.webSearch.executionStatus).toBe("unknown");
  });

  it("regression: canonical payload digest is stable", () => {
    expect(rayOfr.proofEnvelope.payloadDigestSha256).toBe(
      "85e82d474841f0497fb7f6fcb0a7fec7ce808de9779ff69eff32a6b6560ea4a5"
    );
  });

  it("regression: EAS schema uses bytes32 receiptDigest", () => {
    expect(rayProjection.eas.schema).toContain("bytes32 receiptDigest");
  });

  it("regression: EAS projection revocable is false", () => {
    expect(rayProjection.eas.revocable).toBe(false);
  });

  it("regression: no real attestation UID exists", () => {
    expect(rayProjection.protocolSuppliedAfterIssuance.attestationUID).toBeNull();
    expect(rayProjection.protocolSuppliedAfterIssuance.schemaUID).toBeNull();
  });
});

describe("Phase 1 fixture catalog", () => {
  it("keeps stable route slugs separate from point-in-time display symbols", () => {
    const slugs = batchManifest.assets.map((asset) => asset.slug);
    const symbols = batchManifest.assets.map((asset) => asset.displaySymbol);
    expect(slugs).toEqual(["pepsi", "nvidia", "bitcoin", "alphabet", "spy"]);
    expect(symbols).toEqual(["PEP", "NVDA", "BTC", "GOOG", "SPY"]);
    expect(new Set(slugs).size).toBe(batchManifest.assets.length);
    expect(batchManifest.assets.every((asset) => Array.isArray(asset.aliases))).toBe(true);
  });

  it("contains 60 unique individual forecast receipts across five assets", () => {
    expect(fixtureCatalog.receiptCount).toBe(60);
    expect(new Set(fixtureCatalog.entries.map((entry) => entry.receiptDigest)).size).toBe(60);
    expect(new Set(fixtureCatalog.entries.map((entry) => entry.forecastId)).size).toBe(60);
    for (const asset of ["alphabet", "bitcoin", "nvidia", "pepsi", "spy"]) {
      expect(fixtureCatalog.entries.filter((entry) => entry.assetSlug === asset)).toHaveLength(12);
    }
  });

  it("validates and recomputes every generated payload digest", async () => {
    for (const entry of fixtureCatalog.entries) {
      const fixture = await loadFixture(entry);
      expect(fixture.document).toBeDefined();
      expect(fixture.projection).toBeDefined();
      expect(validateSchema(fixture.document).valid).toBe(true);
      const digest = await sha256(canonicalizeJson(extractReceiptPayload(fixture.document!)));
      expect(digest).toBe(entry.receiptDigest);
      expect(fixture.projection!.encodedFields.receiptDigest).toBe(`0x${entry.receiptDigest}`);
      expect(fixture.projection!.protocolSuppliedAfterIssuance.attestationUID).toBeNull();
    }
  });
});

describe("verify pipeline", () => {
  it("PASS on untouched canonical Ray fixture", async () => {
    const { verifyDocument } = await import("../../lib/verify/pipeline");
    const result = await verifyDocument(rayOfr);
    expect(result.dataStatus).toBe("loaded");
    expect(result.integrityStatus).toBe("pass");
    expect(result.chainStatus).toBe("not_issued");
    expect(result.isRetrospective).toBe(true);
  });

  it("FAIL when one step value is changed", async () => {
    const { verifyDocument } = await import("../../lib/verify/pipeline");
    const tampered = JSON.parse(JSON.stringify(rayOfr));
    tampered.receiptPayload.forecast.prediction.points[0].value = 999;
    const result = await verifyDocument(tampered);
    expect(result.integrityStatus).toBe("fail");
    expect(result.failureReason).toBe("digest_mismatch");
  });
});

describe("eas verify", () => {
  it("returns not_issued when attestationUID is null", async () => {
    const { verifyChain } = await import("../../lib/eas/verify");
    const result = await verifyChain(null, undefined);
    expect(result.status).toBe("not_issued");
  });

  it("accepts mixed-case hex UID", async () => {
    const { isValidBytes32, normalizeHex } = await import("../../lib/eas/verify");
    expect(isValidBytes32("0xABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789")).toBe(true);
    expect(normalizeHex("0xABCD")).toBe("0xabcd");
  });

  it("ABI-encodes and decodes all 17 projection fields", async () => {
    const { encodeAttestationData } = await import("../../lib/eas/encode");
    const { decodeAttestationData } = await import("../../lib/eas/decode");
    const encoded = encodeAttestationData(rayProjection.encodedFields);
    const decoded = decodeAttestationData(encoded);

    expect((encoded.length - 2) / 2).toBe(1056);
    expect(decoded).toEqual(rayProjection.encodedFields);
  });

  it("verifies a decoded EAS record against the sealed payload digest", async () => {
    const { encodeAttestationData } = await import("../../lib/eas/encode");
    const { verifyAttestationRecord } = await import("../../lib/eas/verify");
    const uid = `0x${"11".repeat(32)}` as const;
    const result = verifyAttestationRecord(
      {
        uid,
        schema: `0x${"22".repeat(32)}`,
        time: 1785945600n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: `0x${"00".repeat(32)}`,
        recipient: `0x${"00".repeat(20)}`,
        attester: `0x${"33".repeat(20)}`,
        revocable: false,
        data: encodeAttestationData(rayProjection.encodedFields),
      },
      uid,
      rayOfr.proofEnvelope.payloadDigestSha256
    );

    expect(result.status).toBe("verified");
    expect(result.attestedDigest).toBe(rayOfr.proofEnvelope.payloadDigestSha256);
    expect(result.blockTimestamp).toBe(1785945600);
  });
});

describe("EAS constants regression", () => {
  it("schema uses bytes32 receiptDigest (not string)", async () => {
    const { EAS_SCHEMA } = await import("../../lib/eas/constants");
    expect(EAS_SCHEMA).toContain("bytes32 receiptDigest");
    expect(EAS_SCHEMA).not.toContain("string receiptDigest");
  });
});
