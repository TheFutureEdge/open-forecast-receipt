import { publicationDigest,requireValue,validatePublicationPlan } from './publication-plan.mjs';

export function assertEnvironmentPromotion(source,target){
  const {projectId:sourceProject,...a}=source;
  const {projectId:targetProject,...b}=target;
  requireValue(sourceProject!==targetProject && publicationDigest(a)===publicationDigest(b),'Environment promotion may change only the target project');
}

export function promoteSignedManifest(sourcePlan,targetPlan,signed){
  validatePublicationPlan(sourcePlan);validatePublicationPlan(targetPlan);
  assertEnvironmentPromotion(sourcePlan.configuration,targetPlan.configuration);
  requireValue(signed.planDigest===sourcePlan.planDigest,'Source signed manifest plan mismatch');
  const identity=plan=>plan.receipts.map(r=>({forecastPublicId:r.forecastPublicId,receiptDigest:r.receiptDigest,canonicalPath:r.canonicalPath,encodedData:r.encodedData})).sort((a,b)=>a.forecastPublicId.localeCompare(b.forecastPublicId));
  requireValue(publicationDigest(identity(sourcePlan))===publicationDigest(identity(targetPlan)) && publicationDigest(sourcePlan.transactions)===publicationDigest(targetPlan.transactions),'Environment receipt or calldata parity mismatch');
  requireValue(signed.transactions.length===targetPlan.transactions.length && new Set(signed.transactions.map(h=>h.toLowerCase())).size===signed.transactions.length && signed.transactions.every(h=>/^0x[0-9a-fA-F]{64}$/.test(h)),'Incomplete transaction manifest');
  return {...signed,planDigest:targetPlan.planDigest};
}
