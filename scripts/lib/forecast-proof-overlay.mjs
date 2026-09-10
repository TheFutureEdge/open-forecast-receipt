// Proofs are appended after publication; frozen forecast identities never change.
const bytes32 = /^0x[0-9a-fA-F]{64}$/;
const address = /^0x[0-9a-fA-F]{40}$/;
export function indexVerifiedProofs(records) {
  const byDigest = new Map();
  for (const proof of records) {
    if (proof.state !== 'verified' || proof.visibility !== 'public' || proof.publicationStatus !== 'published') continue;
    const network = typeof proof.network === 'string' ? proof.network : proof.network?.caip2;
    if (!['eip155:8453', 'eip155:84532'].includes(network)
      || !/^[0-9a-f]{64}$/.test(proof.receiptDigest)
      || !bytes32.test(proof.attestationUID) || !bytes32.test(proof.transactionHash)
      || !bytes32.test(proof.schemaUID) || !address.test(proof.attester)
      || !Number.isSafeInteger(proof.blockTimestamp) || proof.blockTimestamp <= 0) {
      throw new Error('Invalid verified proof metadata');
    }
    const current = byDigest.get(proof.receiptDigest);
    // Prefer production evidence, then the earliest anchor on that network.
    if (!current || (current.proofNetwork !== 'eip155:8453' && network === 'eip155:8453')
      || (current.proofNetwork === network && proof.blockTimestamp < current.blockTimestamp)) {
      byDigest.set(proof.receiptDigest, {
        chainStatus: 'verified', showcaseSelected: true, proofNetwork: network,
        attestationUID: proof.attestationUID, transactionHash: proof.transactionHash,
        schemaUID: proof.schemaUID, attester: proof.attester, blockTimestamp: proof.blockTimestamp,
      });
    }
  }
  return byDigest;
}

export function withVerifiedProof(forecast, byDigest) {
  return { ...forecast, ...byDigest.get(forecast.receiptDigest) };
}
