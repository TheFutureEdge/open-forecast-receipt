#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getServerFirestore } from './lib/firestore-client.mjs';

const LEGACY_ID = /^https:\/\/ipulseai\.com\/receipts\/sha256\/([a-f0-9]{64})$/;
const DIGEST = /^[a-f0-9]{64}$/;

/** Project only identities; sealed receipt contents and proofs stay untouched. */
export function buildLegacyReceiptRedirects(records) {
  const redirects = new Map();
  for (const { digest, receiptId } of records) {
    if (typeof receiptId !== 'string' || !DIGEST.test(digest)) {
      throw new Error('Invalid published receipt identity or document digest');
    }
    const match = LEGACY_ID.exec(receiptId);
    if (!match) {
      if (receiptId.startsWith('https://ipulseai.com/receipts/')) {
        throw new Error(`Unexpected publisher receipt URL: ${receiptId}`);
      }
      continue;
    }
    const identity = match[1];
    if (redirects.has(identity) && redirects.get(identity) !== digest) {
      throw new Error(`Ambiguous legacy receipt identity: ${identity}`);
    }
    redirects.set(identity, digest);
  }
  return Object.fromEntries([...redirects].sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const separator = arg.indexOf('=');
    return [arg.slice(2, separator), arg.slice(separator + 1)];
  }));
  const project = args.project;
  if (!['oflapp-prod', 'oflapp-staging'].includes(project) || !args.output) {
    throw new Error('Use --project=oflapp-prod|oflapp-staging --output=<JSON path>');
  }
  const db = getServerFirestore(project);
  try {
    const collection = db.collection('public_receipts');
    const count = (await collection.count().get()).data().count;
    if (count < 1 || count > 20000) throw new Error(`Review inventory size before export: ${count}`);
    const snapshot = await collection.select('document.receiptPayload.receipt.receiptId')
      .limit(count + 1).get();
    if (snapshot.size !== count) throw new Error('Receipt inventory changed during export; retry');
    const redirects = buildLegacyReceiptRedirects(snapshot.docs.map(row => ({
      digest: row.id,
      receiptId: row.data().document?.receiptPayload?.receipt?.receiptId,
    })));
    const output = resolve(args.output);
    const bytes = `${JSON.stringify(redirects, null, 2)}\n`;
    const metadata = {
      sourceProject: project,
      sourceCollection: 'public_receipts',
      exportedAt: new Date().toISOString(),
      publishedReceiptCount: count,
      legacyRedirectCount: Object.keys(redirects).length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, bytes);
    await writeFile(output.replace(/\.json$/, '.meta.json'), `${JSON.stringify(metadata, null, 2)}\n`);
    console.log(JSON.stringify({ ...metadata, output }, null, 2));
  } finally { await db.terminate(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
