import {describe,it,expect} from 'vitest';
import {selectIpulseProofCohort} from '../lib/publication-scope.mjs';
const transactions=[{entityId:'silver'},{entityId:'btc'}];
describe('explicit staging proof sidecar scope',()=>{
  it('retains the full cohort by default',()=>expect(selectIpulseProofCohort(transactions,'ipulse-401013')).toBe(transactions));
  it('permits an explicit known staging subset without changing the sealed plan',()=>{
    expect(selectIpulseProofCohort(transactions,'pulse-staging-e1394','btc')).toEqual([{entityId:'btc'}]);
    expect(transactions).toHaveLength(2);
  });
  it.each(['','btc,btc','unknown','btc,'])('rejects invalid staging scope %s',ids=>expect(()=>selectIpulseProofCohort(transactions,'pulse-staging-e1394',ids)).toThrow());
  it('never narrows production proof publication',()=>expect(()=>selectIpulseProofCohort(transactions,'ipulse-401013','btc')).toThrow('only for staging QA'));
});
