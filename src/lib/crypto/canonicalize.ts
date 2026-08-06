import { canonicalize } from "json-canonicalize";

/**
 * RFC 8785 JSON Canonicalization Scheme via json-canonicalize v2.
 *
 * Inputs MUST be JSON-safe: no undefined values, functions, symbols, BigInt,
 * or cyclic references. All values must be representable in JSON.
 *
 * This function wraps the json-canonicalize v2 canonicalize() function.
 * If canonicalizeEx is needed, configure undefinedInArrayToNull: false.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value === "undefined") {
    throw new Error("canonicalizeJson: input must not be null or undefined");
  }
  // JSON-safe guard: check for non-serializable values
  assertJsonSafe(value);
  return canonicalize(value);
}

function assertJsonSafe(value: unknown, seen?: Set<unknown>): void {
  if (typeof value === "undefined") {
    throw new Error("JSON-safe guard: value contains undefined");
  }
  if (typeof value === "function" || typeof value === "symbol") {
    throw new Error(
      `JSON-safe guard: value contains ${typeof value === "function" ? "function" : "symbol"}`
    );
  }
  if (typeof value === "bigint") {
    throw new Error("JSON-safe guard: value contains BigInt");
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  if (!seen) seen = new Set();
  if (seen.has(value)) {
    throw new Error("JSON-safe guard: cyclic reference detected");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      assertJsonSafe(item, seen);
    }
  } else {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      assertJsonSafe((value as Record<string, unknown>)[key], seen);
    }
  }
}

/**
 * Return a detached copy of the immutable payload covered by the OFR digest.
 * Proof metadata is outside this object and may change without resealing the
 * forecast payload.
 */
export function extractReceiptPayload(
  document: Record<string, unknown>
): Record<string, unknown> {
  if (!document.receiptPayload || typeof document.receiptPayload !== "object") {
    throw new Error("extractReceiptPayload: receiptPayload is missing or invalid");
  }
  return structuredClone(document.receiptPayload as Record<string, unknown>);
}
