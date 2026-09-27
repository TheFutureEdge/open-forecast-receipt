export function useSealedBatch6Fixtures(scoringBatch, legacySlug) {
  return scoringBatch === 6 && Boolean(legacySlug);
}

export function receiptIssuanceTime(scoringBatch, supplied) {
  const value = supplied || (scoringBatch === 6 ? '2026-08-06T12:00:00Z' : undefined);
  if (!value || !Number.isFinite(Date.parse(value))) throw new Error('New batches require an explicit, fixed --issued-at timestamp');
  return value;
}

export function proofNetworkCaip2(network = 'base-sepolia') {
  const values = { 'base-mainnet': 'eip155:8453', 'base-sepolia': 'eip155:84532' };
  if (!Object.hasOwn(values, network)) throw new Error('Unsupported publication proof network');
  return values[network];
}

/** Late provider responses keep the batch's actual published ledger location. */
export function publicLedgerBatchKey(scoringBatch, forecastCreatedAt, publishedBatchKey) {
  if (scoringBatch > 6) {
    if (!new RegExp(`^\\d{4}-\\d{2}-\\d{2}-sb${scoringBatch}$`).test(publishedBatchKey || '')) throw new Error('New batches require a governed public ledger key');
    return publishedBatchKey;
  }
  const date = String(forecastCreatedAt).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Missing forecast date');
  return `${date}-sb${scoringBatch}`;
}
