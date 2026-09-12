import { requireValue } from './publication-plan.mjs';

export function mergeForecastHistory(previous, records, scoringBatch, assetPaths) {
  const result=structuredClone(previous);
  const seen=new Set();
  for(const row of records){
    requireValue(row.visibility==='public' && row.publicationStatus==='published' && row.collectionId===`batch-${scoringBatch}`,'History input must be a public frozen forecast in the selected collection');
    requireValue(!seen.has(row.forecastPublicId),'Duplicate permanent forecast ID');seen.add(row.forecastPublicId);
    const url=new URL(row.originalSource.url);
    const match=url.pathname.match(/^(\/[^/]+\/[^/]+)\/forecast-history\/(\d{4}-\d{2}-\d{2}-sb\d+)(?:\/|$)/);
    requireValue(url.origin==='https://ipulseai.com' && match && match[2].endsWith(`-sb${scoringBatch}`),'Missing governed iPulse historical source URL');
    const batchKey=match[2];
    const assetPath=assetPaths?.[row.entityId];
    requireValue(typeof assetPath==='string' && /^\/[^/]+\/[^/]+$/.test(assetPath),'Missing governed iPulse asset URL mapping');
    const revision=Number(String(row.sourceRevisionId).replace(/^r/,''));
    requireValue(Number.isSafeInteger(revision)&&revision>0,'Missing source revision');
    result[assetPath] ||= {};result[assetPath][batchKey] ||= {forecasts:[]};
    const forecasts=result[assetPath][batchKey].forecasts;
    const existing=forecasts.find(f=>f.forecastPublicId===row.forecastPublicId);
    if(existing){requireValue(existing.revision===revision && existing.mode===row.forecasterMode,'Existing historic identity changed');continue;}
    forecasts.push({forecastPublicId:row.forecastPublicId,label:row.forecasterLabel,mode:row.forecasterMode,revision});
  }
  return result;
}
