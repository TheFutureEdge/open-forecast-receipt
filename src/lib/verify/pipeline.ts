import type { OfrDocument } from "../../types/ofr";
import type { VerificationResult } from "../../types/verification";
import { validateSchema } from "../schema/validate";
import { canonicalizeJson, extractReceiptPayload } from "../crypto/canonicalize";
import { sha256 } from "../crypto/hash";

/**
 * Full async verification pipeline: Schema → Canonicalize → Hash → Compare.
 *
 * Schema validation is synchronous (Ajv).
 * Canonicalization via json-canonicalize v2 (RFC 8785), then hash via Web Crypto.
 * Chain verification only attempted when attestationUID is non-null.
 * All functions are async — Web Crypto API is Promise-based.
 */
export async function verifyDocument(
  document: unknown,
  attestationUID?: string | null
): Promise<VerificationResult> {
  // Step 1: Schema validation
  const schemaResult = validateSchema(document);

  if (!schemaResult.valid) {
    return {
      dataStatus: "invalid",
      integrityStatus: "not_checked",
      chainStatus: "not_issued",
      schemaErrors: schemaResult.errors,
      failureReason: "schema_validation_failed",
      failureDetails: schemaResult.errors.join("; "),
      isRetrospective: false,
    };
  }

  const ofr = document as OfrDocument;

  // Step 2: Determine data status
  const dataStatus = "loaded";

  // Step 3: Compute digest
  const payload = extractReceiptPayload(document as Record<string, unknown>);
  const canonicalized = canonicalizeJson(payload);
  const computedDigest = await sha256(canonicalized);

  const documentDigest = ofr.proofEnvelope.payloadDigestSha256;

  // Step 4: Compare digests
  const integrityPass = computedDigest === documentDigest;
  const integrityStatus = integrityPass ? "pass" : "fail";

  // Step 5: Chain verification (only when attestationUID is non-null)
  let chainStatus: VerificationResult["chainStatus"] = "not_issued";
  let onchainDigest: string | undefined;
  let chainBlockTimestamp: number | null = null;
  let chainFailureReason: VerificationResult["failureReason"];

  if (attestationUID) {
    const { verifyChain } = await import("../eas/verify");
    const proof = ofr.proofEnvelope.proofs.find(item => item.type === "eas_attestation" && item.id === attestationUID);
    const chainResult = await verifyChain(attestationUID, computedDigest,
      typeof proof?.network === "string" ? proof.network : undefined,
      typeof proof?.attester === "string" ? proof.attester : undefined);
    onchainDigest = chainResult.attestedDigest;
    chainBlockTimestamp = chainResult.blockTimestamp ?? null;
    if (chainResult.status === "verified") {
      chainStatus = "verified";
    } else if (chainResult.status === "revoked") {
      chainStatus = "revoked";
    } else if (chainResult.status === "unavailable") {
      chainStatus = "unavailable";
      chainFailureReason = chainResult.failureReason as VerificationResult["failureReason"];
    }
  }

  const isRetrospective = ofr.receiptPayload.receipt.issuanceMode === "retrospective";

  const result: VerificationResult = {
    dataStatus,
    integrityStatus,
    chainStatus,
    computedDigest,
    documentDigest,
    onchainDigest,
    failureReason: integrityPass ? chainFailureReason : "digest_mismatch",
    failureDetails: integrityPass
      ? chainFailureReason
        ? `Chain verification failed: ${chainFailureReason}`
        : undefined
      : "Computed receiptPayload digest does not match proofEnvelope.payloadDigestSha256",
    isRetrospective,
    temporalInfo: {
      forecastCreatedAt: ofr.receiptPayload.forecast.temporal.forecastCreatedAt,
      sourcePublishedAt: ofr.receiptPayload.provenance.sourcePublication.publishedAt,
      chainBlockTimestamp,
    },
  };

  return result;
}

/**
 * Compute the receipt digest without full verification.
 * Returns just the hex digest string.
 */
export async function computeDigest(document: unknown): Promise<string> {
  const payload = extractReceiptPayload(document as Record<string, unknown>);
  const canonicalized = canonicalizeJson(payload);
  return await sha256(canonicalized);
}
