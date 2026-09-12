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
