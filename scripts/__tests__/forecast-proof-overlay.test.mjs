import { describe, it, expect } from 'vitest';
import { indexVerifiedProofs, withVerifiedProof } from '../lib/forecast-proof-overlay.mjs';
const digest = 'ab'.repeat(32);
const proof = { state:'verified', visibility:'public', publicationStatus:'published', receiptDigest:digest, network:{caip2:'eip155:84532'}, attestationUID:`0x${'11'.repeat(32)}`, transactionHash:`0x${'22'.repeat(32)}`, schemaUID:`0x${'33'.repeat(32)}`, attester:`0x${'44'.repeat(20)}`, blockTimestamp:1789000000 };
describe('proof metadata overlay', () => {
  it('adds independently verified proof without mutating frozen records or permanent paths', () => {
    const frozen = Object.freeze({ receiptDigest:digest, forecastPublicId:'f-original', canonicalPath:'/original', chainStatus:'not_issued' });
    const merged = withVerifiedProof(frozen,indexVerifiedProofs([proof]));
    expect(merged).toMatchObject({ forecastPublicId:'f-original', canonicalPath:'/original', receiptDigest:digest, chainStatus:'verified', proofNetwork:'eip155:84532' });
    expect(frozen.chainStatus).toBe('not_issued');
  });
  it('never upgrades pending or private proofs', () => {
    expect(indexVerifiedProofs([{...proof,state:'pending'},{...proof,visibility:'private'}]).size).toBe(0);
  });
  it('fails closed for malformed verified metadata', () => {
    expect(()=>indexVerifiedProofs([{...proof,transactionHash:'invented'}])).toThrow();
  });
  it('prefers mainnet and preserves other receipts independently', () => {
    expect(indexVerifiedProofs([proof,{...proof,network:{caip2:'eip155:8453'}}]).get(digest).proofNetwork).toBe('eip155:8453');
    expect(withVerifiedProof({receiptDigest:'cd'.repeat(32),chainStatus:'not_issued'},indexVerifiedProofs([proof])).chainStatus).toBe('not_issued');
  });
});
