import { createHash } from 'node:crypto';
import { canonicalize } from 'json-canonicalize';
import { encodeFunctionData, parseAbi, encodeAbiParameters, parseAbiParameters } from 'viem';
import eas from '../../src/data/eas-base-sepolia.json' with { type: 'json' };

export const publicationDigest = value => createHash('sha256').update(canonicalize(value)).digest('hex');
export const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
export const submissionAbi = parseAbi([
  'function multiAttest((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value)[] data)[] multiRequests) payable returns (bytes32[])',
  'function register(string schema, address resolver, bool revocable) returns (bytes32)',
  'function getSchema(bytes32 uid) view returns ((bytes32 uid, address resolver, bool revocable, string schema))',
]);

export function validatePublicationConfig(config) {
  requireValue(config.version === 'ofl-publication-v1', 'Unsupported publication configuration');
  requireValue(/^[a-z0-9][a-z0-9-]{0,59}$/.test(config.runId), 'Use a stable, unique runId');
  requireValue(['oflapp-prod', 'oflapp-staging'].includes(config.projectId), 'Explicit Library project required');
  requireValue([8453, 84532].includes(config.chainId), 'Select Base mainnet (8453) or Sepolia (84532)');
  requireValue(Number.isSafeInteger(config.scoringBatch) && config.scoringBatch >= 6, 'Batch 6 or later required');
  requireValue(config.collectionId === `batch-${config.scoringBatch}`, 'Collection and batch disagree');
  requireValue(Array.isArray(config.assets) && config.assets.length > 0, 'Declare the complete reviewed asset cohort');
  requireValue(new Set(config.assets.map(a => a.entityId)).size === config.assets.length, 'Duplicate asset selection');
  for (const asset of config.assets) {
    requireValue(typeof asset.entityId === 'string' && /^[a-zA-Z0-9_-]+$/.test(asset.entityId), 'Invalid asset identity');
    requireValue(Number.isSafeInteger(asset.expectedReceipts) && asset.expectedReceipts > 0, 'Declare expected receipt count per asset');
  }
  if (config.scoringBatch > 6) requireValue(typeof config.receiptIssuedAt === 'string' && Number.isFinite(Date.parse(config.receiptIssuedAt)), 'New batches require an explicit, fixed receiptIssuedAt');
  return config;
}

export function encodeProjection(fields) {
  const parameters = parseAbiParameters(eas.schema);
  return encodeAbiParameters(parameters, parameters.map(({ name, type }) => type === 'uint64' ? BigInt(fields[name]) : fields[name]));
}

export function groupedTransactions(receipts, assets, chainId) {
  return assets.map(({ entityId, expectedReceipts }) => {
    const rows = receipts.filter(r => r.entityId === entityId).sort((a, b) => a.forecastPublicId.localeCompare(b.forecastPublicId));
    requireValue(rows.length === expectedReceipts, `Incomplete cohort for ${entityId}: ${rows.length}/${expectedReceipts}`);
    return { entityId, receiptCount: rows.length, to: eas.contracts.eas, value: '0', chainId,
      data: encodeFunctionData({ abi: submissionAbi, functionName: 'multiAttest', args: [[{ schema: eas.schemaUid, data: rows.map(row => ({ recipient: eas.recipient, expirationTime: 0n, revocable: false, refUID: eas.refUid, data: row.encodedData, value: 0n })) }]] }),
    };
  });
}

export function sealPublicationPlan(plan) {
  const { planDigest: ignored, ...payload } = plan;
  return { ...payload, planDigest: publicationDigest(payload) };
}

export function validatePublicationPlan(plan) {
  const { planDigest, ...payload } = plan;
  requireValue(plan.formatVersion === 'ofr-publication-plan-v2' && planDigest === publicationDigest(payload), 'Publication plan digest mismatch');
  validatePublicationConfig(plan.configuration);
  const c = plan.configuration;
  requireValue(plan.projectId === c.projectId && plan.chainId === c.chainId && plan.schemaUid === eas.schemaUid, 'Plan environment or schema mismatch');
  requireValue(new Set(plan.receipts.map(r => r.receiptDigest)).size === plan.receipts.length, 'Duplicate receipt digest');
  requireValue(new Set(plan.receipts.map(r => r.forecastPublicId)).size === plan.receipts.length, 'Duplicate forecast identity');
  requireValue(plan.receipts.length === c.assets.reduce((n,a) => n+a.expectedReceipts,0), 'Incomplete publication inventory');
  for (const row of plan.receipts) {
    requireValue(row.forecastId === row.document.receiptPayload.forecast.forecastId, 'Forecast identity mismatch');
    requireValue(publicationDigest(row.document.receiptPayload) === row.receiptDigest, 'Receipt digest mismatch');
    requireValue(row.document.receiptPayload.forecast.entity.id === row.entityId && row.document.receiptPayload.forecast.run.runNumber === c.scoringBatch, 'Receipt batch/entity mismatch');
    requireValue(row.encodedData === encodeProjection(row.projection.encodedFields), 'Encoded projection mismatch');
    requireValue(row.projection.encodedFields.receiptDigest === `0x${row.receiptDigest}`, 'Projection digest mismatch');
  }
  requireValue(canonicalize(plan.transactions) === canonicalize(groupedTransactions(plan.receipts,c.assets,c.chainId)), 'Asset submissions differ from the reviewed receipts');
  const registration = { to: eas.contracts.schemaRegistry, value: '0', chainId: c.chainId, data: encodeFunctionData({ abi: submissionAbi, functionName: 'register', args: [eas.schema,eas.resolver,false] }) };
  requireValue(canonicalize(plan.registration) === canonicalize(registration), 'Schema registration call mismatch');
  return plan;
}
