import { it,expect,vi } from 'vitest';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { servePublicationWallet } from '../lib/publication-wallet.mjs';
import { savePublicationState } from '../lib/publication-state.mjs';
import eas from '../../src/data/eas-base-sepolia.json' with {type:'json'};

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
