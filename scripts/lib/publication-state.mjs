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
  if (previous && previous.status !== 'wallet_rejected') throw new Error('A signing attempt already exists. Recover its transaction before retrying.');
  return { ...journal, transactions: { ...journal.transactions, [id]: { status: 'awaiting_wallet', startedAt: new Date().toISOString(), previousAttempts: previous ? [...(previous.previousAttempts || []), {status:previous.status,startedAt:previous.startedAt}] : [] } } };
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
