#!/usr/bin/env node
import ipulseAssetPaths from '../src/data/ipulse-public-asset-paths.json' with {type:'json'};
import { readFile, mkdir, open, rm, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { validatePublicationConfig, validatePublicationPlan, publicationDigest, requireValue } from './lib/publication-plan.mjs';
import { savePublicationState, mergeProofRegistries, recordTransactionHash } from './lib/publication-state.mjs';
import { getServerFirestore } from './lib/firestore-client.mjs';
import { activateCatalogGeneration } from './lib/catalog-generation.mjs';
import { assertEnvironmentPromotion,promoteSignedManifest } from './lib/publication-promotion.mjs';
import { mergeForecastHistory } from './lib/publication-history.mjs';
import { verifyPublicPublication } from './lib/publication-http.mjs';
import { servePublicationWallet } from './lib/publication-wallet.mjs';

const root=resolve(import.meta.dirname,'..');
const arg=name=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const command=process.argv[2];
const commands=['prepare-library','adopt-library','adopt-signatures','publish-library','prepare','sign','recover','verify','catalog','export-ipulse','export-history','sync-ipulse','run','smoke','status'];
if(!commands.includes(command)){
  console.log('Usage: npm run publication -- <'+commands.join('|')+'> --config=publication/batch-6.json [--directory=PATH] [--apply] [--attester=PUBLIC_ADDRESS]');
  process.exit(command==='--help'||!command?0:1);
}
const configPath=resolve(arg('config')||join(root,'publication/batch-6.json'));
const config=validatePublicationConfig(JSON.parse(await readFile(configPath,'utf8')));
const directory=resolve(arg('directory')||join(root,'.publication-runs',`${config.runId}-${config.projectId}-${config.chainId}`));
await mkdir(directory,{recursive:true});
const path=name=>join(directory,name);
const exists=async name=>access(path(name)).then(()=>true,()=>false);
const read=async name=>JSON.parse(await readFile(path(name),'utf8'));
const apply=process.argv.includes('--apply');
if(apply)requireValue(process.env.OFR_CONFIRM_FIRESTORE_PROJECT===config.projectId,'Set OFR_CONFIRM_FIRESTORE_PROJECT to the exact reviewed project');
let lock;
try{lock=await open(path('.lock'),'wx',0o600);await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));}
catch{throw new Error(`Another operation owns ${path('.lock')}. If recovering after a crash, verify its PID is no longer running before removing that lock.`);}
const release=async()=>{await lock.close();await rm(path('.lock'),{force:true});};
let serverRunning=false;
let catalogDb;
const execute=(script,args=[],options={})=>{
  const result=spawnSync(process.execPath,[join(root,'scripts',script),...args],{cwd:root,env:process.env,encoding:'utf8',maxBuffer:200*1024*1024});
  if(result.stdout)process.stdout.write(options.quiet?'':result.stdout);
  if(result.stderr)process.stderr.write(result.stderr);
  if(result.status!==0)throw new Error(`${script} did not complete. Resolve its reported condition and rerun; do not resubmit blockchain transactions.`);
  return result.stdout;
};
async function plan(){
  requireValue(await exists('plan.json'),'Run prepare first');
  const value=validatePublicationPlan(await read('plan.json'));
  requireValue(publicationDigest(value.configuration)===publicationDigest(config),'Configuration changed after preparation; use a new run directory');
  return value;
}
async function prepare(){
  if(await exists('plan.json')){await plan();console.log('Reusing the sealed plan.');return;}
  execute('prepare-live-showcase.mjs',[`--config=${configPath}`,`--output=${directory}`]);
}
async function prepareLibrary(){
  requireValue(!(await exists('library-bundle.json')),'A fixed library bundle already exists; reuse it instead of regenerating source data');
  execute('sync-ipulse-entity-catalog.mjs',[`--source-project=${config.dataProject||'data-platform-436809'}`,`--project=${config.projectId}`,`--scoring-batch=${config.scoringBatch}`,'--semantic-environment=prod',`--output-dir=${directory}`,`--plan-output=${path('entity-plan.json')}`]);
  execute('publish-ipulse-batch.mjs',[`--project=${config.projectId}`,`--scoring-batch=${config.scoringBatch}`,`--issued-at=${config.receiptIssuedAt}`,`--source-firestore-project=${config.sourceFirestoreProject||'ipulse-401013'}`,`--data-project=${config.dataProject||'data-platform-436809'}`,`--entity-catalog=${path(`scoring-batch-${config.scoringBatch}-entity-catalog.json`)}`,`--proof-network=${config.chainId===8453?'base-mainnet':'base-sepolia'}`,`--proof-assets=${config.assets.map(a=>a.entityId).join(',')}`,`--bundle-output=${path('library-bundle.json')}`,`--plan-output=${path('library-plan.json')}`]);
  await savePublicationState(path('library-bundle-seal.json'),{configuration:config,configurationDigest:publicationDigest(config),bundleDigest:publicationDigest(await read('library-bundle.json')),entityPlanDigest:publicationDigest(await read('entity-plan.json'))});
}
async function adoptLibrary(){
  requireValue(arg('from'),'Supply the existing reviewed run directory with --from');
  requireValue(!(await exists('library-bundle.json')) && !(await exists('plan.json')),'Target run already has publication artifacts');
  const source=resolve(arg('from'));
  const seal=JSON.parse(await readFile(join(source,'library-bundle-seal.json'),'utf8'));
  assertEnvironmentPromotion(seal.configuration,config);
  const bundle=JSON.parse(await readFile(join(source,'library-bundle.json'),'utf8'));
  const entities=JSON.parse(await readFile(join(source,'entity-plan.json'),'utf8'));
  requireValue(seal.bundleDigest===publicationDigest(bundle) && seal.entityPlanDigest===publicationDigest(entities),'Source publication artifacts changed');
  await savePublicationState(path('library-bundle.json'),bundle);
  await savePublicationState(path('entity-plan.json'),entities);
  await savePublicationState(path('library-bundle-seal.json'),{...seal,configuration:config,configurationDigest:publicationDigest(config)});
  console.log('Adopted identical reviewed source artifacts for the other environment. Nothing published.');
}
async function adoptSignatures(){
  requireValue(arg('from'),'Supply the signed run directory with --from');
  requireValue(!(await exists('signed-transactions.json')) && !(await exists('signing-journal.json')),'Target signing artifacts already exist');
  const source=resolve(arg('from'));
  const sourcePlan=JSON.parse(await readFile(join(source,'plan.json'),'utf8'));
  const signed=JSON.parse(await readFile(join(source,'signed-transactions.json'),'utf8'));
  await savePublicationState(path('signed-transactions.json'),promoteSignedManifest(sourcePlan,await plan(),signed));
  console.log('Identical receipt hashes, paths and calldata verified; adopted existing transaction hashes without reissuing.');
}
async function publishLibrary(){
  const seal=await read('library-bundle-seal.json');
  requireValue(seal.configurationDigest===publicationDigest(config)&&seal.bundleDigest===publicationDigest(await read('library-bundle.json')),'Reviewed library bundle changed');
  requireValue(seal.entityPlanDigest===publicationDigest(await read('entity-plan.json')),'Reviewed entity plan changed');
  execute('sync-ipulse-entity-catalog.mjs',[`--input-plan=${path('entity-plan.json')}`,`--project=${config.projectId}`,...(apply?['--apply']:[])]);
  execute('publish-library-bundle.mjs',[`--input=${path('library-bundle.json')}`,`--project=${config.projectId}`,...(apply?['--apply']:[])]);
  if(apply)await savePublicationState(path('library-published.json'),{bundleDigest:seal.bundleDigest,projectId:config.projectId});
}
async function verify(){
  const value=await plan();
  if(!(await exists('signed-transactions.json')) && await exists('signing-journal.json')){
    const journal=await read('signing-journal.json');
    requireValue(journal.planDigest===value.planDigest,'Journal plan mismatch');
    const transactions=value.transactions.map(t=>journal.transactions[t.entityId]?.hash);
    requireValue(transactions.every(Boolean),'Wallet signatures are still required; run sign with the publishing wallet address');
    await savePublicationState(path('signed-transactions.json'),{planDigest:value.planDigest,attester:journal.attester,transactions});
  }
  requireValue(await exists('signed-transactions.json'),'Wallet signatures are still required; run sign with the publishing wallet address');
  const signed=await read('signed-transactions.json');
  requireValue(signed.planDigest===value.planDigest,'Signed transactions belong to a different plan');
  execute('sync-live-showcase-proofs.mjs',[`--plan=${path('plan.json')}`,`--attester=${signed.attester}`,`--transactions=${signed.transactions.join(',')}`,`--project=${config.projectId}`,`--output=${path('verified-proofs.json')}`,...(apply?['--apply']:[])]);
  if(apply)await savePublicationState(path('proofs-published.json'),{planDigest:value.planDigest,registryDigest:publicationDigest(await read('verified-proofs.json'))});
}
async function catalog(){
  if(!apply){execute('materialize-public-catalogs.mjs',[`--project=${config.projectId}`]);return;}
  const db=catalogDb ||= getServerFirestore(config.projectId);
  const stage=await exists('proofs-published.json')?'proofs':'library';
  const journalName=`catalog-${stage}.json`;
  let saved=await exists(journalName)?await read(journalName):null;
  let pointer=await db.doc('public_catalog_state/current').get();
  if(!saved){
    saved={generationId:`${config.runId}-${stage}-${Date.now()}`,expectedCurrent:pointer.data()?.activeGenerationId||'legacy'};
    await savePublicationState(path(journalName),saved);
  }
  if(pointer.data()?.activeGenerationId===saved.generationId){console.log(`Catalog ${saved.generationId} already active`);return;}
  requireValue((pointer.data()?.activeGenerationId||'legacy')===saved.expectedCurrent,'Catalog changed concurrently; review before starting a new generation');
  let generation=await db.doc(`public_catalog_generations/${saved.generationId}`).get();
  if(!generation.exists){
    execute('materialize-public-catalogs.mjs',[`--project=${config.projectId}`,'--apply','--stage-only',`--generation=${saved.generationId}`]);
    generation=await db.doc(`public_catalog_generations/${saved.generationId}`).get();
  }
  requireValue(generation.data()?.status==='ready','Incomplete generation retained inactive. Review the failed build and use a fresh generation; never overwrite it.');
  if(stage==='proofs'){
    const registry=await read('verified-proofs.json');
    const proofState=await read('proofs-published.json');
    const prepared=await plan();
    requireValue(proofState.planDigest===prepared.planDigest && proofState.registryDigest===publicationDigest(registry),'Proof publication checkpoint mismatch');
    for(const asset of config.assets){
      const document=await db.doc(`public_catalog_generations/${saved.generationId}/public_entity_forecast_catalogs/${config.collectionId}__${asset.entityId}`).get();
      const text=JSON.stringify(document.data());
      for(const row of prepared.receipts.filter(r=>r.entityId===asset.entityId))requireValue(text?.includes(registry[row.forecastPublicId]?.attestationUID),'Verified proof missing from candidate catalog');
    }
  }
  // The original pointer snapshot protects against changes during these checks.
  await activateCatalogGeneration(db,saved.generationId,pointer);
  await savePublicationState(path(journalName),{...saved,activated:true});
  console.log(`Activated verified catalog ${saved.generationId}`);
}
async function exportIpulse(){
  const proofState=await read('proofs-published.json');
  const incoming=await read('verified-proofs.json');
  requireValue(proofState.registryDigest===publicationDigest(incoming),'Verified registry changed after publication');
  const existing=arg('registry');
  requireValue(existing,'Pass --registry=/path/to/ipulse/src/data/forecast-library-proofs.json to preserve prior batches');
  const previous=JSON.parse(await readFile(resolve(existing),'utf8'));
  const merged=mergeProofRegistries(previous,incoming);
  await savePublicationState(path('ipulse-proof-registry.json'),merged);
  console.log(`Merged registry ready for the iPulse release: ${path('ipulse-proof-registry.json')}`);
}
async function exportHistory(){
  requireValue(arg('history'),'Pass --history=/path/to/ipulse/src/data/forecast-library-history.json');
  const previous=JSON.parse(await readFile(resolve(arg('history')),'utf8'));
  const db=catalogDb ||= getServerFirestore(config.projectId);
  const snapshot=await db.collection('public_forecast_revisions').where('collectionId','==',config.collectionId).get();
  requireValue(snapshot.size>0,'No public frozen forecasts in selected collection');
  const merged=mergeForecastHistory(previous,snapshot.docs.map(d=>d.data()),config.scoringBatch,ipulseAssetPaths);
  await savePublicationState(path('ipulse-forecast-history.json'),merged);
  console.log(`Merged ${snapshot.size} permanent forecast links: ${path('ipulse-forecast-history.json')}`);
}
async function smoke(){
  const value=await plan();
  const registry=await exists('proofs-published.json')?await read('verified-proofs.json'):null;
  if(registry)requireValue((await read('proofs-published.json')).registryDigest===publicationDigest(registry),'Registry checkpoint mismatch');
  const baseUrl=config.projectId==='oflapp-prod'?'https://forecastlibrary.com':'https://ofl-staging--oflapp-staging.us-central1.hosted.app';
  const result=await verifyPublicPublication(value,baseUrl,registry);
  await savePublicationState(path('public-verification.json'),result);
  console.log(JSON.stringify({forecasts:result.forecasts,urls:result.urls,proofsChecked:Boolean(registry),baseUrl}));
}
async function syncIpulse(){
  await plan();
  requireValue(arg('ipulse-project'),'Pass --ipulse-project=the-reviewed-iPulse-project');
  requireValue(await exists('ipulse-forecast-history.json'),'Export the complete forecast history first');
  requireValue((await read('proofs-published.json')).registryDigest===publicationDigest(await read('verified-proofs.json')),'Published proof registry checkpoint mismatch');
  execute('sync-ipulse-ledger-proofs.mjs',[
    `--project=${arg('ipulse-project')}`,`--plan=${path('plan.json')}`,
    `--proofs=${path('verified-proofs.json')}`,`--history=${path('ipulse-forecast-history.json')}`,
    `--output=${path(`ipulse-ledger-proofs-${arg('ipulse-project')}.json`)}`,...(apply?['--apply']:[]),
  ]);
}
try{
  if(command==='prepare-library')await prepareLibrary();
  if(command==='adopt-library')await adoptLibrary();
  if(command==='adopt-signatures')await adoptSignatures();
  if(command==='publish-library')await publishLibrary();
  if(command==='prepare')await prepare();
  if(command==='verify')await verify();
  if(command==='catalog')await catalog();
  if(command==='smoke')await smoke();
  if(command==='export-ipulse')await exportIpulse();
  if(command==='export-history')await exportHistory();
  if(command==='sync-ipulse')await syncIpulse();
  if(command==='run'){
    if(await exists('library-bundle.json') && !(await exists('library-published.json'))){await publishLibrary();if(!apply){console.log('Library dry run finished. --apply is needed to publish before preparing blockchain calls.');process.exitCode=0;}else await catalog();}
    if(!(await exists('library-bundle.json')) || await exists('library-published.json')){
      if(apply && await exists('library-published.json') && !(await exists('proofs-published.json')))await catalog();
      await prepare();await verify();
      if(apply){await catalog();await smoke();if(arg('registry'))await exportIpulse();if(arg('history'))await exportHistory();if(arg('ipulse-project'))await syncIpulse();}
    }
  }
  if(command==='sign'){
    const value=await plan();
    requireValue(arg('attester'),'Supply the public publishing wallet with --attester');
    const chain=config.chainId===8453?base:baseSepolia;
    const client=createPublicClient({chain,transport:http(chain.id===8453?'https://mainnet.base.org':'https://sepolia.base.org')});
    requireValue(await client.getChainId()===chain.id,'RPC network mismatch');
    const server=await servePublicationWallet({plan:value,client,attester:arg('attester'),journalPath:path('signing-journal.json'),journal:await exists('signing-journal.json')?await read('signing-journal.json'):null,signedPath:path('signed-transactions.json'),saveSigned:savePublicationState});
    serverRunning=true;
    for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(async()=>{await release();process.exit(0);}));
  }
  if(command==='recover'){
    const value=await plan(),journal=await read('signing-journal.json');
    requireValue(journal.planDigest===value.planDigest,'Journal plan mismatch');
    const id=arg('submission'),hash=arg('transaction');
    requireValue(id==='schema'||value.transactions.some(t=>t.entityId===id),'Unknown submission');
    await savePublicationState(path('signing-journal.json'),recordTransactionHash(journal,id,hash));
    console.log('Recovered transaction hash recorded. Verification still checks its exact contents.');
  }
  if(command==='status'){
    const files=['library-bundle.json','library-published.json','plan.json','signing-journal.json','signed-transactions.json','verified-proofs.json','proofs-published.json','catalog-proofs.json','ipulse-proof-registry.json'];
    console.log(JSON.stringify({directory,config,artifacts:Object.fromEntries(await Promise.all(files.map(async name=>[name,await exists(name)])))},null,2));
  }
}catch(error){
  console.error(error.message);process.exitCode=1;
}finally{
  if(catalogDb)await catalogDb.terminate();
  if(!serverRunning)await release();
}
