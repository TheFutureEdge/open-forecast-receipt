import { it,expect,vi } from 'vitest';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { servePublicationWallet,publicationLabel } from '../lib/publication-wallet.mjs';
import { savePublicationState,recordReviewedCancellation } from '../lib/publication-state.mjs';
import eas from '../../src/data/eas-base-sepolia.json' with {type:'json'};

it('labels the publisher, original forecast date range and variable cohort without changing transactions',()=>{
  const tx={entityId:'asset',receiptCount:15,data:'0x1234'};
  const plan={configuration:{scoringBatch:7,assets:[{entityId:'asset',label:'PepsiCo'}]},receipts:['2026-07-05','2026-07-06'].map(date=>({entityId:'asset',document:{receiptPayload:{issuer:{name:'iPulse AI'},forecast:{temporal:{forecastCreatedAt:date+'T12:00:00Z'}}}}}))};
  expect(publicationLabel(plan,tx)).toBe('iPulse AI | Batch 7 | Forecasts dated 2026-07-05 to 2026-07-06 | 15 forecasts for PepsiCo');
  expect(tx).toEqual({entityId:'asset',receiptCount:15,data:'0x1234'});
});

it.each([true,false])('checks registration at its inclusion block after a stale initial read (present=%s)',async(present)=>{
  const directory=await mkdtemp(join(tmpdir(),'ofr-wallet-schema-'));
  const attester='0x1111111111111111111111111111111111111111';
  const hash='0x'+'ab'.repeat(32);
  const registration={to:eas.contracts.schemaRegistry,data:'0x5678'};
  const plan={planDigest:'sealed',chainId:8453,network:'Base',configuration:{collectionId:'batch-6',assets:[{entityId:'asset',label:'Example'}]},receipts:[{}],registration,transactions:[{entityId:'asset',receiptCount:1}]};
  const readContract=vi.fn(async({blockNumber})=>blockNumber===100n && present?{uid:eas.schemaUid,schema:eas.schema,resolver:eas.resolver,revocable:false}:{uid:'0x'+'00'.repeat(32)});
  const client={readContract,getTransactionReceipt:async()=>({status:'success',blockNumber:100n}),getTransaction:async()=>({from:attester,to:registration.to,input:registration.data,value:0n})};
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});
  let server;
  try{
    server=await servePublicationWallet({plan,client,attester,journalPath:join(directory,'journal.json'),journal:{planDigest:'sealed',attester,transactions:{schema:{status:'submitted',hash}}},signedPath:join(directory,'signed.json'),saveSigned:savePublicationState});
    const url=new URL(log.mock.calls[0][0].split(' ').at(-1));
    const response=await fetch(url.origin+'/api/state',{headers:{Authorization:'Bearer '+url.hash.slice(1)}});
    const state=await response.json();
    expect(readContract.mock.calls[1][0].blockNumber).toBe(100n);
    expect(response.status).toBe(present?200:400);
    if(present)expect(state.next.id).toBe('asset');
    else expect(state.error).toContain('absent or differs at its inclusion block');
    expect(JSON.parse(await readFile(join(directory,'journal.json'),'utf8')).transactions.schema.hash).toBe(hash);
  }finally{
    log.mockRestore();if(server)await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});
  }
});

it('requires a local session, journals before signing, and resumes only the matching transaction',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'ofr-wallet-'));
  const attester='0x1111111111111111111111111111111111111111';
  const hash='0x'+'ab'.repeat(32);
  const tx={entityId:'asset',chainId:8453,to:eas.contracts.eas,value:'0',data:'0x1234',receiptCount:12};
  const plan={planDigest:'sealed',chainId:8453,network:'Base',configuration:{collectionId:'batch-6',assets:[{entityId:'asset',label:'Example'}]},receipts:Array(12).fill({}),registration:{to:eas.contracts.schemaRegistry,data:'0x5678'},transactions:[tx]};
  const client={readContract:async()=>({uid:eas.schemaUid}),getTransactionReceipt:async()=>({status:'success'}),getTransaction:async()=>({from:attester,to:tx.to,input:tx.data,value:0n})};
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});
  let server;
  try{
    server=await servePublicationWallet({plan,client,attester,journalPath:join(directory,'journal.json'),journal:null,signedPath:join(directory,'signed.json'),saveSigned:savePublicationState});
    const url=new URL(log.mock.calls[0][0].split(' ').at(-1));const token=url.hash.slice(1);const origin=url.origin;
    const request=(path,body,headers={})=>fetch(origin+'/api/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{Origin:origin,'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
    expect((await fetch(origin+'/api/state')).status).toBe(400);
    expect((await request('intent',{id:'asset'},{Origin:'https://attacker.example'})).status).toBe(400);
    expect((await (await request('state')).json()).next.id).toBe('asset');
    expect((await request('intent',{id:'asset'})).status).toBe(200);
    expect(JSON.parse(await readFile(join(directory,'journal.json'),'utf8')).transactions.asset.status).toBe('awaiting_wallet');
    expect((await (await request('state')).json()).uncertain).toBe(true);
    expect((await request('intent',{id:'asset'})).status).toBe(400);
    expect((await request('rejected',{id:'asset',code:4001})).status).toBe(200);
    expect((await request('intent',{id:'asset'})).status).toBe(200);
    expect((await request('hash',{id:'asset',hash})).status).toBe(200);
    expect((await (await request('state')).json()).complete).toBe(true);
    expect(JSON.parse(await readFile(join(directory,'signed.json'),'utf8')).transactions).toEqual([hash]);
    expect((await request('hash',{id:'asset',hash:'0x'+'cd'.repeat(32)})).status).toBe(400);
  }finally{
    log.mockRestore();if(server)await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});
  }
});

it.each([6,7])('only offers a cancelled retry while its pinned nonce remains unused (current=%s)',async(currentNonce)=>{
  const directory=await mkdtemp(join(tmpdir(),'ofr-wallet-retry-'));
  const attester='0x1111111111111111111111111111111111111111',hash='0x'+'ab'.repeat(32);
  const tx={entityId:'asset',chainId:8453,to:eas.contracts.eas,value:'0',data:'0x1234',receiptCount:14};
  const plan={planDigest:'sealed',chainId:8453,network:'Base',configuration:{collectionId:'batch-7',assets:[{entityId:'asset',label:'Example'}]},receipts:Array(14).fill({}),registration:{},transactions:[tx]};
  const journal=recordReviewedCancellation({planDigest:'sealed',attester,transactions:{asset:{status:'submitted',hash,previousAttempts:[]}}},'asset',{hash,nonce:6,checkedAt:'2026-09-27T11:30:00Z',walletOutcome:'smart_transaction_cancelled_failed_timeout',observations:['a','b'].map(url=>({url,transaction:null,receipt:null,latestNonce:6,pendingNonce:6}))});
  const client={readContract:async()=>({uid:eas.schemaUid}),getTransactionCount:async()=>currentNonce};
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});let server;
  try{
    server=await servePublicationWallet({plan,client,attester,journalPath:join(directory,'journal.json'),journal,signedPath:join(directory,'signed.json'),saveSigned:savePublicationState});
    const url=new URL(log.mock.calls[0][0].split(' ').at(-1));
    const headers={Authorization:'Bearer '+url.hash.slice(1)};
    const response=await fetch(url.origin+'/api/state',{headers});const state=await response.json();
    expect(response.status).toBe(currentNonce===6?200:400);
    if(currentNonce===6){expect(state.next.nonce).toBe(6);expect(state.next.data).toBe(tx.data);expect(state.next.recoveryReview.hash).toBe(hash);}
    else expect(state.error).toContain('no longer unused');
    const intent=await fetch(url.origin+'/api/intent',{method:'POST',headers:{...headers,Origin:url.origin,'Content-Type':'application/json'},body:JSON.stringify({id:'asset'})});
    expect(intent.status).toBe(currentNonce===6?200:400);
    const saved=JSON.parse(await readFile(join(directory,'journal.json'),'utf8')).transactions.asset;
    expect(saved.nonce).toBe(6);expect(saved.previousAttempts[0].hash).toBe(hash);
    expect(saved.status).toBe(currentNonce===6?'awaiting_wallet':'reviewed_retry');
  }finally{log.mockRestore();if(server)await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});

it.each([true,false])('distinguishes a visible pending transaction from a wallet hash absent on chain (visible=%s)',async(visible)=>{
  const directory=await mkdtemp(join(tmpdir(),'ofr-wallet-pending-'));
  const attester='0x1111111111111111111111111111111111111111',hash='0x'+'ab'.repeat(32);
  const plan={planDigest:'sealed',chainId:8453,network:'Base',configuration:{collectionId:'batch-7',assets:[{entityId:'asset'}]},receipts:[],registration:{},transactions:[{entityId:'asset'}]};
  const client={readContract:async()=>({uid:eas.schemaUid}),getTransactionReceipt:async()=>{throw Object.assign(new Error('No receipt'),{name:'TransactionReceiptNotFoundError'});},getTransaction:async()=>{if(!visible)throw Object.assign(new Error('No transaction'),{name:'TransactionNotFoundError'});return {hash};}};
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});let server;
  try{
    server=await servePublicationWallet({plan,client,attester,journalPath:join(directory,'journal.json'),journal:{planDigest:'sealed',attester,transactions:{asset:{status:'submitted',hash}}},signedPath:join(directory,'signed.json'),saveSigned:savePublicationState});
    const url=new URL(log.mock.calls[0][0].split(' ').at(-1));
    const response=await fetch(url.origin+'/api/state',{headers:{Authorization:'Bearer '+url.hash.slice(1)}});
    const state=await response.json();expect(response.status).toBe(200);expect(state.waiting).toBe(true);expect(state.broadcastStatus).toBe(visible?'pending':'not_visible');expect(state.transactionHash).toBe(hash);expect(state.next).toBeUndefined();
    expect(JSON.parse(await readFile(join(directory,'journal.json'),'utf8')).transactions.asset.hash).toBe(hash);
  }finally{log.mockRestore();if(server)await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
