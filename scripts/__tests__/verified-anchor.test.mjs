import { describe,it,expect } from 'vitest';
import { assertVerifiedAnchor } from '../lib/verified-anchor.mjs';
const uid=`0x${'11'.repeat(32)}`, schemaUid=`0x${'22'.repeat(32)}`, attester=`0x${'33'.repeat(20)}`;
const row={receiptDigest:'ab'.repeat(32),encodedData:'0x123456'};
const expected={uid,schemaUid,attester,blockTimestamp:1789000000n};
const valid={uid,schema:schemaUid,attester,data:row.encodedData,recipient:`0x${'00'.repeat(20)}`,refUID:`0x${'00'.repeat(32)}`,time:expected.blockTimestamp,expirationTime:0n,revocationTime:0n,revocable:false};
describe('full attestation verification before publication',()=>{
  it('accepts exactly the reviewed payload, signer, schema and timestamp',()=>expect(()=>assertVerifiedAnchor(valid,row,expected)).not.toThrow());
  it.each([{data:'0x123457'},{attester:`0x${'44'.repeat(20)}`},{schema:uid},{time:1788999999n},{expirationTime:1n},{revocationTime:1n},{revocable:true},{recipient:attester},{refUID:uid}])('rejects altered evidence %#',change=>{
    expect(()=>assertVerifiedAnchor({...valid,...change},row,expected)).toThrow();
  });
});
