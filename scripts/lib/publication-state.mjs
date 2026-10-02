import { open, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { canonicalize } from 'json-canonicalize';
import { randomUUID } from 'node:crypto';

export async function savePublicationState(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2)+'\n'); await handle.sync(); }
  finally { await handle.close(); }
  await rename(temporary, path);
  const parent = await open(dirname(path), 'r');
  try { await parent.sync(); } finally { await parent.close(); }
}

export function recordSigningIntent(journal, id) {
  const previous = journal.transactions[id];
  if (previous && !['wallet_rejected','reviewed_retry'].includes(previous.status)) throw new Error('A signing attempt already exists. Recover its transaction before retrying.');
  const previousAttempts=previous?.status==='reviewed_retry'?previous.previousAttempts:previous?[...(previous.previousAttempts || []),{status:previous.status,startedAt:previous.startedAt}]:[];
  return { ...journal, transactions: { ...journal.transactions, [id]: { status: 'awaiting_wallet', startedAt: new Date().toISOString(), previousAttempts,...(previous?.nonce!==undefined?{nonce:previous.nonce}:{}),...(previous?.recoveryReview?{recoveryReview:previous.recoveryReview}:{}) } } };
}

// Absence of a receipt alone never authorizes retry. This path requires a
// reviewed terminal wallet failure and independent RPC observations. The
// retry uses the still-unused nonce, so a late original cannot issue twice.
export function recordReviewedCancellation(journal,id,review) {
  const previous=journal.transactions[id];
  if(previous?.status!=='submitted'||previous.hash!==review.hash)throw new Error('Review must match the recorded submitted transaction');
  if(!['smart_transaction_cancelled_failed_timeout','wallet_failed_not_broadcast'].includes(review.walletOutcome)||!Number.isSafeInteger(review.nonce)||review.nonce<0)throw new Error('Explicit terminal wallet failure and unused nonce required');
  if(review.walletOutcome==='wallet_failed_not_broadcast'&&previous.nonce!==review.nonce)throw new Error('Terminal wallet failure recovery requires the original pinned nonce');
  if(!Array.isArray(review.observations)||new Set(review.observations.map(r=>r.url)).size<2||!review.observations.every(r=>r.transaction===null&&r.receipt===null&&r.latestNonce===review.nonce&&r.pendingNonce===review.nonce))throw new Error('Two independent RPCs must agree that the hash is absent and nonce unused');
  return {...journal,transactions:{...journal.transactions,[id]:{status:'reviewed_retry',nonce:review.nonce,previousAttempts:[...(previous.previousAttempts||[]),{...previous,previousAttempts:undefined,walletOutcome:review.walletOutcome,reviewedAt:review.checkedAt}],recoveryReview:review}}};
}

// EIP-1193 code 4001 explicitly means the user rejected the request. Timeouts,
// transport errors and all other codes remain uncertain and cannot be retried.
export function recordWalletRejection(journal, id, code) {
  const previous=journal.transactions[id];
  if (code !== 4001 || previous?.status !== 'awaiting_wallet' || previous.hash) throw new Error('Only an explicit wallet rejection can clear a pending attempt');
  return {...journal,transactions:{...journal.transactions,[id]:{...previous,status:'wallet_rejected'}}};
}

export function recordTransactionHash(journal, id, hash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('Invalid transaction hash');
  const previous = journal.transactions[id];
  if (!previous) throw new Error('Record the signing intent first');
  if (previous.hash && previous.hash.toLowerCase() !== hash.toLowerCase()) throw new Error('Cannot replace a recorded transaction');
  return { ...journal, transactions: { ...journal.transactions, [id]: { ...previous, status: 'submitted', hash } } };
}

export function mergeProofRegistries(previous, incoming) {
  const result = { ...previous };
  for (const [id, proof] of Object.entries(incoming)) {
    const old = result[id];
    if (old) {
      if (old.receiptDigest !== proof.receiptDigest) throw new Error(`Immutable receipt conflict: ${id}`);
      if (old.network === proof.network && canonicalize(old) !== canonicalize(proof)) throw new Error(`Conflicting proof on the same network: ${id}`);
      if (old.network === 'eip155:8453' && proof.network === 'eip155:84532') continue;
    }
    result[id] = proof;
  }
  return result;
}
