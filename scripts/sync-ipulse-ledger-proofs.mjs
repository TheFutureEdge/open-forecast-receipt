// Read-only with respect to source forecasts and the chain. Creates proof sidecars only.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { canonicalize } from 'json-canonicalize';
import { getServerFirestore } from './lib/firestore-client.mjs';
import { validatePublicationPlan } from './lib/publication-plan.mjs';

const arg = name => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3);
const project = arg('project');
assert(['ipulse-401013', 'pulse-staging-e1394'].includes(project), 'Explicit iPulse project required');
const apply = process.argv.includes('--apply');
if (apply) assert.equal(process.env.OFR_CONFIRM_IPULSE_PROJECT, project);
const plan = validatePublicationPlan(JSON.parse(await readFile(arg('plan'), 'utf8')));
assert.equal(plan.chainId, 8453, 'This publisher imports verified Base mainnet evidence only');
const registry = JSON.parse(await readFile(arg('proofs'), 'utf8'));
const history = JSON.parse(await readFile(arg('history'), 'utf8'));
const library = getServerFirestore(plan.projectId);
const db = getServerFirestore(project);
const prefix = 'papp_oracle_fincore_prediction_market__';
const sidecars = `${prefix}catalogs.forecast_publication_proofs`;
const active = (await db.doc(`${prefix}controls.prediction_batch_releases/current`).get()).data();
assert(active?.activeReleaseId, 'Active iPulse release is required');
const results = [];
// Validate every cohort before writing any sidecar. No fixed advisor count.
for (const group of plan.transactions) {
  console.log(`Checking immutable publication and verified proofs: ${group.entityId}`);
  const rows = plan.receipts.filter(r => r.entityId === group.entityId);
  assert.equal(rows.length, group.receiptCount);
  const locations = Object.entries(history).flatMap(([assetPath, batches]) =>
    Object.entries(batches).filter(([, b]) => b.forecasts.some(f => f.forecastPublicId === rows[0].forecastPublicId))
      .map(([batchKey, batch]) => ({ assetPath, batchKey, batch })));
  assert.equal(locations.length, 1, 'Each forecast must have one governed ledger location');
  const { assetPath, batchKey, batch } = locations[0];
  assert.deepEqual(rows.map(r => r.forecastPublicId).sort(), batch.forecasts.map(f => f.forecastPublicId).sort(), 'Complete asset cohort required');
  const refs = rows.map(r => {
    const p = registry[r.forecastPublicId];
    assert(p && p.network === 'eip155:8453' && p.receiptDigest === r.receiptDigest, 'Registry binding mismatch');
    assert.match(p.attestationUID, /^0x[0-9a-fA-F]{64}$/);
    return library.doc(`public_proofs/${p.network}__${p.attestationUID}`);
  });
  const verified = await library.getAll(...refs);
  const receipts = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], p = registry[r.forecastPublicId], saved = verified[i].data();
    assert(saved?.state === 'verified' && saved.visibility === 'public' && saved.publicationStatus === 'published', 'Proof is not published and verified');
    assert.equal(saved.forecastPublicId, r.forecastPublicId);
    assert.equal(saved.network.caip2, p.network);
    assert.equal(saved.schemaUID, plan.schemaUid);
    for (const key of ['receiptDigest', 'attestationUID', 'transactionHash', 'attester', 'blockTimestamp']) assert.equal(saved[key], p[key], `Proof ${key} conflict`);
    receipts[r.forecastPublicId] = {
      ...p,
      forecastId: r.forecastId,
      receiptUrl: `https://forecastlibrary.com/forecasts/${r.forecastPublicId}`,
      attestationUrl: `https://base.easscan.org/attestation/view/${p.attestationUID}`,
      transactionUrl: `https://basescan.org/tx/${p.transactionHash}`,
    };
  }
  const [legacy, release] = await db.getAll(
    db.doc(`${prefix}catalogs.eod_close_price_predictions/${group.entityId}`),
    db.doc(`${prefix}catalogs.eod_close_price_predictions_by_release/${active.activeReleaseId}__${group.entityId}`),
  );
  const catalogs = [legacy.data() || {}, release.data() || {}];
  const batches = Object.assign({}, ...catalogs.map(c => c.batches || {}), ...catalogs.map(c => c.batch_overrides || {}));
  const number = rows[0].document.receiptPayload.forecast.run.runNumber;
  const entry = batches[`sb${number}`];
  const pointer = entry?.ai_forecasts;
  assert(pointer?.status === 'published', 'No published iPulse forecast pointer');
  assert.equal(`${entry.generation_date_utc.slice(0, 10)}-sb${number}`, batchKey);
  const sourceId = pointer.batch_prediction_document_id || pointer.document_id;
  assert(sourceId && !sourceId.includes('/'), 'Invalid immutable source document ID');
  const sourceRef = db.doc(`${prefix}datasets.eod_close_price_batch_predictions/${sourceId}`);
  const sourceSnapshot = await sourceRef.get();
  const source = sourceSnapshot.data();
  assert(source?.immutable && source.asset_id === group.entityId && source.scoring_batch === number, 'Immutable source identity mismatch');
  assert.equal(source.content_digest_sha256, pointer.content_digest_sha256);
  assert.deepEqual(source.predictions.map(p => p.prediction_request_task_id).sort(), rows.map(r => r.forecastId).sort(), 'Receipt cohort does not match the immutable publication');
  for (const row of rows) {
    const prediction = source.predictions.find(p => p.prediction_request_task_id === row.forecastId);
    const forecast = row.document.receiptPayload.forecast;
    const points = [...prediction.timeseries_numerical].sort((a, b) => Number(a.forecast_step) - Number(b.forecast_step));
    assert.deepEqual(points.map(p => Math.round(Number(p.predicted_step_over_step_change_percent) * 100)), forecast.prediction.points.map(p => p.value), 'Forecast values differ from the sealed receipt');
    assert.deepEqual(points.map(p => Date.parse(p.forecast_timestamp_utc)), forecast.prediction.points.map(p => Date.parse(p.validAt)), 'Forecast horizon dates differ');
    assert.equal(Math.round(Number(prediction.forecast_horizon_anchor_value) * 1_000_000), forecast.anchor.valueScaled, 'Anchor value differs');
    assert.equal(Date.parse(prediction.forecast_horizon_anchor_value_timestamp_utc), Date.parse(forecast.temporal.anchorAt), 'Anchor time differs');
    assert.equal(prediction.investment_rating_by_model, forecast.classification.value, 'Forecast classification differs');
    assert.equal(row.document.receiptPayload.receipt.issuanceMode, rows[0].document.receiptPayload.receipt.issuanceMode, 'Mixed issuance modes');
  }
  const value = {
    schemaVersion: 'forecast_publication_proofs_v1',
    assetId: group.entityId, assetPath, batchKey,
    sourceBatchPredictionDocumentId: sourceId,
    sourceContentDigestSha256: source.content_digest_sha256,
    network: 'eip155:8453', schemaUid: plan.schemaUid,
    issuanceMode: rows[0].document.receiptPayload.receipt.issuanceMode,
    receiptCount: rows.length, receipts,
  };
  assert(Buffer.byteLength(JSON.stringify(value)) < 900_000, 'Sidecar exceeds safe Firestore size');
  results.push({ ref: db.doc(`${sidecars}/${sourceId}`), sourceRef, sourceSnapshot, value });
}
for (const { ref, sourceRef, sourceSnapshot, value } of results) {
  await db.runTransaction(async tx => {
    const [prior, source] = await tx.getAll(ref, sourceRef);
    assert(source.updateTime.isEqual(sourceSnapshot.updateTime), 'Source changed during preparation');
    if (prior.exists) assert.equal(canonicalize(prior.data()), canonicalize(value), 'Existing proof sidecar conflict; never overwrite');
    else if (apply) tx.create(ref, value);
  });
  if (apply) assert.equal(canonicalize((await ref.get()).data()), canonicalize(value), 'Readback failed');
}
const report = { project, apply, documents: results.map(({ ref, value }) => ({ path: ref.path, assetPath: value.assetPath, batchKey: value.batchKey, receiptCount: value.receiptCount })) };
if (arg('output')) await writeFile(arg('output'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
