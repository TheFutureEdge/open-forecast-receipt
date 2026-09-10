import { describe, expect, it } from 'vitest';
import { getBaseTransactionUrl, getEasAttestationUrl, getEasNetwork, EAS_SCHEMA_UID } from '../../lib/eas/constants';
import { verifyAttestationRecord, verifyChain } from '../../lib/eas/verify';
import { encodeAttestationData } from '../../lib/eas/encode';
import projection from '../../data/fixtures/pepsi/ray-projection.json';
const uid = `0x${'11'.repeat(32)}` as `0x${string}`;
const zero = `0x${'00'.repeat(32)}` as `0x${string}`;
const record = { uid, schema:EAS_SCHEMA_UID, time:1789000000n, expirationTime:0n, revocationTime:0n, refUID:zero, recipient:`0x${'00'.repeat(20)}` as `0x${string}`, attester:`0x${'44'.repeat(20)}` as `0x${string}`, revocable:false, data:encodeAttestationData(projection.encodedFields) };
describe('network-specific blockchain proof', () => {
  it('keeps mainnet and testnet explorers distinct', () => {
    expect(getEasAttestationUrl(uid,'eip155:8453')).toBe(`https://base.easscan.org/attestation/view/${uid}`);
    expect(getBaseTransactionUrl(uid,'eip155:84532')).toBe(`https://sepolia.basescan.org/tx/${uid}`);
    expect(getEasNetwork('eip155:84532').name).toContain('testnet');
  });
  it('refuses unsupported networks without a false verified result', async () => {
    expect(()=>getEasNetwork('eip155:1')).toThrow();
    expect((await verifyChain(uid,projection.encodedFields.receiptDigest.slice(2),'eip155:1')).status).toBe('unavailable');
  });
  it.each([{expirationTime:1800000000n},{revocable:true},{time:0n}])('rejects evidence outside the non-expiring, non-revocable policy case %#', override => {
    expect(verifyAttestationRecord({...record,...override},uid,projection.encodedFields.receiptDigest.slice(2)).status).toBe('unavailable');
  });
});
