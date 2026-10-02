import {it,expect} from 'vitest';
import {publicationGasLimit,BASE_TRANSACTION_GAS_CAP} from '../lib/publication-gas.mjs';

it('keeps the complete Silver cohort below the cap despite a wallet default 50% buffer',()=>{
  const estimate=12_532_654n;
  expect(estimate*150n/100n).toBeGreaterThan(BASE_TRANSACTION_GAS_CAP);
  expect(publicationGasLimit(estimate)).toBe(13_785_920n);
  expect(publicationGasLimit(estimate)).toBeGreaterThan(estimate);
});
it('never lowers the limit below an executable estimate near the cap',()=>{
  expect(publicationGasLimit(16_000_000n)).toBe(BASE_TRANSACTION_GAS_CAP);
  expect(publicationGasLimit(BASE_TRANSACTION_GAS_CAP)).toBe(BASE_TRANSACTION_GAS_CAP);
});
it.each([0n,-1n,BASE_TRANSACTION_GAS_CAP+1n])('rejects an invalid or oversized estimate (%s)',estimate=>expect(()=>publicationGasLimit(estimate)).toThrow());
it('rounds reserves upward and accepts the wallet RPC hex estimate',()=>{
  expect(publicationGasLimit('0xb')).toBe(13n);
  expect(publicationGasLimit('0xbf3c9e')).toBeGreaterThan(BigInt('0xbf3c9e'));
});
