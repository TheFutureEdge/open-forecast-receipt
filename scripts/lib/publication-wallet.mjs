import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getAddress } from 'viem';
import eas from '../../src/data/eas-base-sepolia.json' with { type: 'json' };
import { submissionAbi, requireValue } from './publication-plan.mjs';
import { recordSigningIntent, recordTransactionHash, recordWalletRejection, savePublicationState } from './publication-state.mjs';

export async function servePublicationWallet({ plan, client, attester, journalPath, journal, signedPath, saveSigned, port = 0 }) {
  attester=getAddress(attester);
  requireValue(!journal || (journal.planDigest===plan.planDigest && journal.attester===attester),'Signing journal belongs to another plan or wallet');
  journal ||= { planDigest:plan.planDigest,attester,transactions:{} };
  await savePublicationState(journalPath,journal);
  const calls=[{...plan.registration,id:'schema',label:'Register the non-revocable OFR schema',receiptCount:0},...plan.transactions.map(tx=>({...tx,id:tx.entityId,label:`All ${tx.receiptCount} forecasts for ${plan.configuration.assets.find(a=>a.entityId===tx.entityId)?.label || tx.entityId}`}))];
  const token=randomBytes(32).toString('hex');
  let origin,mutating=false;
  async function nextState(){
    const schema=await client.readContract({address:eas.contracts.schemaRegistry,abi:submissionAbi,functionName:'getSchema',args:[eas.schemaUid]});
    for(const call of calls){
      if(call.id==='schema' && schema.uid===eas.schemaUid)continue;
      const saved=journal.transactions[call.id];
      if(!saved || saved.status==='wallet_rejected')return {next:call};
      if(!saved.hash)return {next:call,uncertain:true};
      let receipt;
      try{receipt=await client.getTransactionReceipt({hash:saved.hash});}
      catch(error){if(error.name==='TransactionReceiptNotFoundError')return {waiting:true};throw error;}
      const tx=await client.getTransaction({hash:saved.hash});
      requireValue(receipt.status==='success' && tx.from.toLowerCase()===attester.toLowerCase() && tx.to?.toLowerCase()===call.to.toLowerCase() && tx.input.toLowerCase()===call.data.toLowerCase() && tx.value===0n,'Recorded transaction failed or differs from the plan; manual recovery required');
      if(call.id==='schema')throw new Error('Schema transaction succeeded but expected schema is absent');
    }
    const signed={planDigest:plan.planDigest,attester,transactions:plan.transactions.map(tx=>journal.transactions[tx.entityId].hash)};
    await saveSigned(signedPath,signed);
    return {complete:true};
  }
  const server=createServer(async(request,response)=>{
    const send=(code,value)=>{response.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify(value));};
    try{
      requireValue(request.headers.host===new URL(origin).host,'Invalid host');
      if(request.method==='GET' && request.url==='/'){
        response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",'X-Content-Type-Options':'nosniff'});
        response.end(await readFile(new URL('../publication-wallet.html',import.meta.url)));return;
      }
      requireValue(request.headers.authorization===`Bearer ${token}`,'Invalid local session token');
      if(request.method==='GET' && request.url==='/api/state'){
        const state=await nextState();
        send(200,{...state,attester,network:plan.network,chainId:plan.chainId,collectionId:plan.configuration.collectionId,assetCount:plan.transactions.length,receiptCount:plan.receipts.length,planDigest:plan.planDigest});return;
      }
      requireValue(request.method==='POST' && request.headers.origin===origin,'Invalid request origin or method');
      requireValue(!mutating,'Another wallet operation is in progress');
      mutating=true;
      try{
        let body='';for await(const chunk of request){body+=chunk;requireValue(body.length<4096,'Request too large');}
        const input=JSON.parse(body);
        requireValue(calls.some(call=>call.id===input.id),'Unknown submission');
        if(request.url==='/api/intent'){
          const state=await nextState();
          requireValue(state.next?.id===input.id && !state.uncertain,'Submission is not ready');
          journal=recordSigningIntent(journal,input.id);
        }else if(request.url==='/api/hash')journal=recordTransactionHash(journal,input.id,input.hash);
        else if(request.url==='/api/rejected')journal=recordWalletRejection(journal,input.id,input.code);
        else throw new Error('Unknown endpoint');
        await savePublicationState(journalPath,journal);
        send(200,{saved:true});
      }finally{mutating=false;}
    }catch(error){send(400,{error:error.message});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;
  console.log(`Open in the browser that contains your wallet: ${origin}/#${token}`);
  console.log('The server is loopback-only. Wallet signatures remain in your wallet. After all submissions are recorded, stop this command and run publication run --apply.');
  return server;
}
