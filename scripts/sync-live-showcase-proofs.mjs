// Verify externally signed transactions before adding proof metadata. Never signs.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { canonicalize } from 'json-canonicalize';
import { createPublicClient, http, parseAbi, decodeEventLog, getAddress, encodeAbiParameters, parseAbiParameters } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import config from '../src/data/eas-base-sepolia.json' with {type:'json'};
import { getServerFirestore } from './lib/firestore-client.mjs';
import { validatePublicationPlan } from './lib/publication-plan.mjs';
import { assertVerifiedAnchor } from './lib/verified-anchor.mjs';
const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length+3);
const assert = (value,message) => { if(!value) throw new Error(message); };
const sha = value => createHash('sha256').update(value).digest('hex');
assert(arg('plan') && arg('attester') && arg('transactions') && arg('output'), '--plan, --attester, --transactions and --output are required');
const plan = validatePublicationPlan(JSON.parse(await readFile(arg('plan'),'utf8')));
const project = arg('project') || plan.projectId;
assert(['oflapp-prod','oflapp-staging'].includes(project),'Explicit Library project required');
assert(project === plan.projectId, 'Prepare and verify a separate plan for each Firestore environment');
const hashes = arg('transactions').split(',');
assert(hashes.length === plan.transactions.length && new Set(hashes).size === hashes.length && hashes.every(h=>/^0x[0-9a-fA-F]{64}$/.test(h)),'Exactly one distinct transaction hash per planned asset required');
const attester = getAddress(arg('attester'));
const chain = plan.chainId === 8453 ? base : baseSepolia;
const network = `eip155:${chain.id}`;
const client = createPublicClient({chain,transport:http(chain.id===8453?'https://mainnet.base.org':'https://sepolia.base.org')});
assert(await client.getChainId() === chain.id,'RPC chain mismatch');
const abi = parseAbi([
  'event Attested(address indexed recipient,address indexed attester,bytes32 uid,bytes32 indexed schemaUID)',
  'function getAttestation(bytes32 uid) view returns ((bytes32 uid,bytes32 schema,uint64 time,uint64 expirationTime,uint64 revocationTime,bytes32 refUID,address recipient,address attester,bool revocable,bytes data))',
]);
const finalized = await client.getBlock({blockTag:'finalized'});
const proofs = [];
const seen = new Set();
for(const hash of hashes) {
  const [receipt,transaction] = await Promise.all([client.getTransactionReceipt({hash}),client.getTransaction({hash})]);
  assert(receipt.status === 'success' && transaction.to?.toLowerCase() === config.contracts.eas.toLowerCase() && transaction.value === 0n,'Transaction is not a successful zero-value EAS submission');
  assert(transaction.from.toLowerCase() === attester.toLowerCase(),'Unexpected transaction signer');
  const group = plan.transactions.find(item=>item.data.toLowerCase() === transaction.input.toLowerCase());
  assert(group,'Transaction calldata differs from the reviewed plan');
  const block = await client.getBlock({blockNumber:receipt.blockNumber});
  assert(finalized.number >= receipt.blockNumber,'Awaiting finalized Base block; rerun verification without resubmitting');
  assert(block.hash === receipt.blockHash,'Receipt block is not canonical');
  const events = receipt.logs.filter(log=>log.address.toLowerCase() === config.contracts.eas.toLowerCase()).flatMap(log=>{
    try { const event=decodeEventLog({abi,data:log.data,topics:log.topics}); return event.eventName==='Attested'?[event]:[]; } catch { return []; }
  });
  assert(events.length===group.receiptCount,'Unexpected individual attestation count for asset');
  for(const event of events) {
    const uid=event.args.uid;
    const attestation=await client.readContract({address:config.contracts.eas,abi,functionName:'getAttestation',args:[uid],blockNumber:finalized.number});
    const row=plan.receipts.find(item=>item.entityId===group.entityId && item.encodedData.toLowerCase()===attestation.data.toLowerCase());
    assert(row && !seen.has(row.receiptDigest),'Duplicate or unrecognized attested forecast');
    assertVerifiedAnchor(attestation,row,{uid,schemaUid:config.schemaUid,attester,blockTimestamp:block.timestamp});
    assert(event.args.attester.toLowerCase()===attester.toLowerCase() && event.args.schemaUID.toLowerCase()===config.schemaUid.toLowerCase(),'Event mismatch');
    seen.add(row.receiptDigest);
    proofs.push({receiptDigest:row.receiptDigest,forecastPublicId:row.forecastPublicId,state:'verified',network:{name:chain.name,caip2:network},schemaUID:config.schemaUid,attestationUID:uid,transactionHash:hash,attester,blockTimestamp:Number(block.timestamp),publicationStatus:'published',visibility:'public'});
  }
}
assert(proofs.length===plan.receipts.length,'Every planned receipt must verify');
const db=getServerFirestore(project);
const apply=process.argv.includes('--apply');
if(apply) assert(process.env.OFR_CONFIRM_FIRESTORE_PROJECT===project,'Exact Firestore project confirmation required');
// Bound transaction size; every chain proof verifies before any Firestore write.
for (let offset=0; offset<proofs.length; offset+=100) {
const chunk=proofs.slice(offset,offset+100);
await db.runTransaction(async tx=>{
  const refs=chunk.flatMap(p=>[db.doc(`public_receipts/${p.receiptDigest}`),db.doc(`public_forecast_revisions/${p.forecastPublicId}`),db.doc(`public_proofs/${network}__${p.attestationUID}`)]);
  const snapshots=await tx.getAll(...refs);
  for(let i=0;i<chunk.length;i++) {
    const proof=chunk[i], row=plan.receipts.find(r=>r.receiptDigest===proof.receiptDigest);
    const saved=snapshots[i*3].data(), frozen=snapshots[i*3+1].data(), prior=snapshots[i*3+2].data();
    assert(saved && frozen && saved.visibility==='public' && saved.publicationStatus==='published','Missing public receipt or revision');
    assert(frozen.receiptDigest===proof.receiptDigest && frozen.forecastId===row.forecastId && frozen.canonicalPath===row.canonicalPath,'Permanent revision changed');
    assert(sha(canonicalize(saved.document.receiptPayload))===proof.receiptDigest,'Saved receipt payload changed');
    const parameters=parseAbiParameters(config.schema), e=saved.projection.encodedFields;
    assert(encodeAbiParameters(parameters,parameters.map(({name,type})=>type==='uint64'?BigInt(e[name]):e[name]))===row.encodedData,'Saved projection changed');
    if(prior) assert(canonicalize(prior)===canonicalize(proof),'Existing proof record conflict');
    const envelopeProof={type:'eas_attestation',status:'verified',id:proof.attestationUID,network,schemaUid:proof.schemaUID,transactionHash:proof.transactionHash,attester,blockTimestamp:new Date(proof.blockTimestamp*1000).toISOString(),revoked:false,verifierVersion:'ofr-live-showcase-v1'};
    const existing=saved.document.proofEnvelope.proofs.find(p=>p.type==='eas_attestation' && p.id===proof.attestationUID && p.network===network);
    if(existing) assert(canonicalize(existing)===canonicalize(envelopeProof),'Existing proof envelope conflict');
    if(apply) {
      if(!prior) tx.create(refs[i*3+2],proof);
      tx.update(refs[i*3],{
        'document.proofEnvelope.proofs':existing?saved.document.proofEnvelope.proofs:[...saved.document.proofEnvelope.proofs,envelopeProof],
        'projection.state':'issued',
        'projection.protocolSuppliedAfterIssuance':{schemaUID:proof.schemaUID,attestationUID:proof.attestationUID,transactionHash:proof.transactionHash,attester,blockTimestamp:proof.blockTimestamp},
      });
    }
  }
});
}
await db.terminate();
const registry=Object.fromEntries(proofs.map(p=>[p.forecastPublicId,{receiptDigest:p.receiptDigest,network,attestationUID:p.attestationUID,transactionHash:p.transactionHash,attester,blockTimestamp:p.blockTimestamp}]));
await writeFile(arg('output'),JSON.stringify(registry,null,2)+'\n');
console.log(JSON.stringify({verified:proofs.length,project,network,applied:apply,receiptPayloadChanges:0,permalinkChanges:0,registry:arg('output'),next:'Rebuild and verify an isolated catalog generation, then activate it. Publish the verified registry to iPulse AI.'},null,2));
