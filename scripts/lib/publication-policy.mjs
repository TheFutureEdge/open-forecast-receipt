/** Admission rules for the current, public-only iPulse publisher adapter. */
export function assertPublicReceiptAdmission(payload, expectedIssuer) {
  if (payload.disclosure?.visibility !== "public") {
    throw new Error("Public publication requires an explicitly public receipt; private/restricted payloads must never enter public namespaces");
  }
  if (["draft", "withdrawn"].includes(payload.receipt?.status)) {
    throw new Error(`Receipt status ${payload.receipt.status} is not eligible for public forecast publication`);
  }
  if (payload.issuer?.id !== expectedIssuer) {
    throw new Error("Receipt issuer does not match this publisher adapter; use a separately governed publisher mapping");
  }
}

/** Current indexes may refresh presentation, but must never replace a revision. */
export function assertForecastIdentityPreserved(existing, proposed) {
  if (!existing) return;
  for (const key of ["forecastId", "publisherId", "forecastPublicId", "receiptDigest", "sourceRevisionId"]) {
    if (existing[key] !== undefined && existing[key] !== proposed[key]) {
      throw new Error(`Forecast revision conflict for ${proposed.forecastId}: ${key} changed; publish a distinct revision record instead of overwriting history`);
    }
  }
}
