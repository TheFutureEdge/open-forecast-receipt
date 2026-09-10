export function assertVerifiedAnchor(attestation, row, expected) {
  const same = (a,b) => String(a).toLowerCase() === String(b).toLowerCase();
  const zeroAddress = `0x${'00'.repeat(20)}`;
  const zeroUid = `0x${'00'.repeat(32)}`;
  if (!same(attestation.uid, expected.uid) || !same(attestation.schema, expected.schemaUid)
    || !same(attestation.attester, expected.attester) || !same(attestation.data, row.encodedData)
    || !same(attestation.recipient, zeroAddress) || !same(attestation.refUID, zeroUid)
    || attestation.time !== expected.blockTimestamp || attestation.time <= 0n
    || attestation.expirationTime !== 0n || attestation.revocationTime !== 0n || attestation.revocable !== false) {
    throw new Error(`Attestation does not prove the reviewed receipt: ${row.receiptDigest}`);
  }
}
