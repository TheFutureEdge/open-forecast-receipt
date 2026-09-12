import { describe,it,expect } from 'vitest';
import { readFile,readdir,mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeFunctionData,decodeFunctionData } from 'viem';
import eas from '../../src/data/eas-base-sepolia.json' with {type:'json'};
import config from '../../publication/batch-6.json' with {type:'json'};
import { publicationDigest,groupedTransactions,encodeProjection,sealPublicationPlan,validatePublicationPlan,submissionAbi } from '../lib/publication-plan.mjs';
import { recordSigningIntent,recordTransactionHash,recordWalletRejection,savePublicationState,mergeProofRegistries } from '../lib/publication-state.mjs';
import { useSealedBatch6Fixtures,receiptIssuanceTime,proofNetworkCaip2 } from '../lib/publication-input.mjs';
import { verifyPublicPublication } from '../lib/publication-http.mjs';

const receipts=[];
const dir=new URL('../../src/data/fixtures/pepsi/',import.meta.url);
for(const name of (await readdir(dir)).filter(n=>n.endsWith('-ofr.json'))){
  const document=JSON.parse(await readFile(new URL(name,dir),'utf8'));
  const projection=JSON.parse(await readFile(new URL(name.replace('-ofr','-projection'),dir),'utf8'));
  const f=document.receiptPayload.forecast;
  receipts.push({forecastPublicId:f.forecastId,forecastId:f.forecastId,receiptDigest:publicationDigest(document.receiptPayload),entityId:f.entity.id,document,projection,encodedData:encodeProjection(projection.encodedFields),canonicalPath:'/canonical/'+f.forecastId});
}
function fixture(){
  const configuration={...config,assets:[config.assets[0]]};
  return sealPublicationPlan({formatVersion:'ofr-publication-plan-v2',configuration,projectId:config.projectId,chainId:config.chainId,schemaUid:eas.schemaUid,receipts:structuredClone(receipts),transactions:groupedTransactions(receipts,configuration.assets,config.chainId),registration:{to:eas.contracts.schemaRegistry,value:'0',chainId:config.chainId,data:encodeFunctionData({abi:submissionAbi,functionName:'register',args:[eas.schema,eas.resolver,false]})}});
}
const journal={planDigest:'fixed',attester:'0x123',transactions:{}};
const hash='0x'+'ab'.repeat(32);
describe('repeatable asset publication',()=>{
  it('encodes exactly 12 independent attestations in one asset transaction',()=>{
    const plan=validatePublicationPlan(fixture());expect(plan.transactions).toHaveLength(1);
    const decoded=decodeFunctionData({abi:submissionAbi,data:plan.transactions[0].data});
    expect(decoded.functionName).toBe('multiAttest');expect(decoded.args[0]).toHaveLength(1);expect(decoded.args[0][0].data).toHaveLength(12);
    expect(decoded.args[0][0].data.every(row=>row.revocable===false && row.value===0n && row.expirationTime===0n)).toBe(true);
  });
  it('rejects a missing forecast instead of partially publishing an asset',()=>expect(()=>groupedTransactions(receipts.slice(1),config.assets.slice(0,1),8453)).toThrow('Incomplete'));
  it('rejects mutated receipt bytes even if the plan was resealed',()=>{const p=fixture();p.receipts[0].document.receiptPayload.forecast.forecastId='changed';expect(()=>validatePublicationPlan(sealPublicationPlan(p))).toThrow();});
  it('rejects altered calldata even if the plan was resealed',()=>{const p=fixture();p.transactions[0].data+='00';expect(()=>validatePublicationPlan(sealPublicationPlan(p))).toThrow('submissions');});
  it('rejects network disagreement',()=>{const p=fixture();p.chainId=84532;expect(()=>validatePublicationPlan(sealPublicationPlan(p))).toThrow('environment');});
  it('rejects duplicate receipts',()=>{const p=fixture();p.receipts[1]=p.receipts[0];expect(()=>validatePublicationPlan(sealPublicationPlan(p))).toThrow('Duplicate');});
  it('never loads Batch 6 fixtures for a later batch',()=>{expect(useSealedBatch6Fixtures(6,'pepsi')).toBe(true);expect(useSealedBatch6Fixtures(7,'pepsi')).toBe(false);expect(()=>receiptIssuanceTime(7)).toThrow();expect(receiptIssuanceTime(7,'2026-09-12T10:00:00Z')).toBe('2026-09-12T10:00:00Z');});
  it('binds proof job network explicitly',()=>{expect(proofNetworkCaip2('base-mainnet')).toBe('eip155:8453');expect(proofNetworkCaip2()).toBe('eip155:84532');expect(()=>proofNetworkCaip2('constructor')).toThrow();});
});
describe('transaction recovery',()=>{
  it('blocks uncertain attempts and submitted transactions from resending',()=>{const pending=recordSigningIntent(journal,'asset');expect(()=>recordSigningIntent(pending,'asset')).toThrow();const sent=recordTransactionHash(pending,'asset',hash);expect(()=>recordSigningIntent(sent,'asset')).toThrow();expect(recordTransactionHash(sent,'asset',hash)).toEqual(sent);expect(()=>recordTransactionHash(sent,'asset','0x'+'cd'.repeat(32))).toThrow();});
  it('only retries explicit wallet rejection and retains its history',()=>{const pending=recordSigningIntent(journal,'asset');expect(()=>recordWalletRejection(pending,'asset',-32000)).toThrow();const rejected=recordWalletRejection(pending,'asset',4001);expect(recordSigningIntent(rejected,'asset').transactions.asset.previousAttempts).toHaveLength(1);});
  it('cannot clear an already recorded hash as a rejection',()=>expect(()=>recordWalletRejection(recordTransactionHash(recordSigningIntent(journal,'asset'),'asset',hash),'asset',4001)).toThrow());
  it('persists concurrent state files completely',async()=>{const directory=await mkdtemp(join(tmpdir(),'ofr-state-'));try{const path=join(directory,'journal.json');await Promise.all([savePublicationState(path,{a:1}),savePublicationState(path,{a:2})]);expect([1,2]).toContain(JSON.parse(await readFile(path,'utf8')).a);expect(await readdir(directory)).toEqual(['journal.json']);}finally{await rm(directory,{recursive:true,force:true});}});
});
describe('proof registry promotion',()=>{
  const proof={receiptDigest:'ab',network:'eip155:8453',attestationUID:'uid'};
  it('retains older batches',()=>expect(mergeProofRegistries({old:proof},{next:proof})).toEqual({old:proof,next:proof}));
  it('rejects immutable digest and same-network proof conflicts',()=>{expect(()=>mergeProofRegistries({old:proof},{old:{...proof,receiptDigest:'cd'}})).toThrow();expect(()=>mergeProofRegistries({old:proof},{old:{...proof,attestationUID:'different'}})).toThrow();});
  it('does not downgrade mainnet evidence to a testnet proof',()=>expect(mergeProofRegistries({old:proof},{old:{...proof,network:'eip155:84532'}}).old).toEqual(proof));
});
describe('anonymous public completion checks',()=>{
  const p=fixture();p.receipts=p.receipts.slice(0,1);const row=p.receipts[0];
  const response=(url)=>Promise.resolve(new Response(url.pathname.startsWith('/api/')?JSON.stringify(row.document):'<html>forecast</html>',{status:200}));
  it('checks the canonical URL, durable short link and receipt hash',async()=>expect((await verifyPublicPublication(p,'https://forecastlibrary.com',null,response)).urls).toBe(3));
  it('rejects redirect-based links',async()=>expect(verifyPublicPublication(p,'https://forecastlibrary.com',null,()=>Promise.resolve(new Response('',{status:301})))).rejects.toThrow('without redirect'));
  it('does not report completion when proof metadata is absent',async()=>expect(verifyPublicPublication(p,'https://forecastlibrary.com',{[row.forecastPublicId]:{attestationUID:'missing',network:'eip155:8453'}},response)).rejects.toThrow('not visible'));
});

describe('cross-environment promotion',()=>{
  it('reuses signatures only for identical receipts and calldata',async()=>{
    const {promoteSignedManifest}=await import('../lib/publication-promotion.mjs');
    const source=fixture(),target=structuredClone(source);target.projectId='oflapp-staging';target.configuration.projectId='oflapp-staging';
    const sealed=sealPublicationPlan(target),signed={planDigest:source.planDigest,attester:'0x'+'11'.repeat(20),transactions:[hash]};
    expect(promoteSignedManifest(source,sealed,signed)).toEqual({...signed,planDigest:sealed.planDigest});
    target.receipts[0].canonicalPath='/changed';expect(()=>promoteSignedManifest(source,sealPublicationPlan(target),signed)).toThrow('parity');
  });
  it('does not promote signatures across chains',async()=>{
    const {assertEnvironmentPromotion}=await import('../lib/publication-promotion.mjs');
    expect(()=>assertEnvironmentPromotion(config,{...config,projectId:'oflapp-staging',chainId:84532})).toThrow();
  });
});
describe('permanent iPulse history exports',()=>{
  it('preserves previous batches and appends only new permanent IDs',async()=>{
    const {mergeForecastHistory}=await import('../lib/publication-history.mjs');
    const row={entityId:'asset',visibility:'public',publicationStatus:'published',collectionId:'batch-7',forecastPublicId:'f-new',forecasterLabel:'Model',forecasterMode:'THINKER',sourceRevisionId:1,originalSource:{url:'https://ipulseai.com/stocks/test/forecast-history/2026-09-12-sb7/ai-forecasts'}};
    const old={'/stocks/test':{'2026-07-05-sb6':{forecasts:[{forecastPublicId:'f-old'}]}}};
    const merged=mergeForecastHistory(old,[row],7,{asset:'/stocks/test'});expect(merged['/stocks/test']['2026-07-05-sb6']).toEqual(old['/stocks/test']['2026-07-05-sb6']);
    expect(mergeForecastHistory(merged,[row],7,{asset:'/stocks/test'})).toEqual(merged);
    expect(()=>mergeForecastHistory(merged,[{...row,sourceRevisionId:2}],7,{asset:'/stocks/test'})).toThrow('identity');
    expect(()=>mergeForecastHistory(old,[{...row,originalSource:{url:'https://other.example/stocks/test/forecast-history/2026-09-12-sb7'}}],7)).toThrow('governed');
  });
});
