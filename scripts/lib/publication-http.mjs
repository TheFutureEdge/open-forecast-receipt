import { publicationDigest, requireValue } from './publication-plan.mjs';

export async function verifyPublicPublication(plan, baseUrl, registry, fetcher=fetch) {
  const checks=[];
  for(let offset=0;offset<plan.receipts.length;offset+=4){
    checks.push(...await Promise.all(plan.receipts.slice(offset,offset+4).map(async row=>{
      const get=async path=>{
        const response=await fetcher(new URL(path,baseUrl),{redirect:'manual',signal:AbortSignal.timeout(30000)});
        requireValue(response.status===200,`Public URL must return 200 without redirect: ${path} (${response.status})`);
        return response;
      };
      const json=await (await get(`/api/v1/receipts/${row.receiptDigest}`)).json();
      requireValue(publicationDigest(json.receiptPayload)===row.receiptDigest,`Public payload digest mismatch: ${row.forecastPublicId}`);
      const canonical=await (await get(row.canonicalPath)).text();
      const short=await (await get(`/forecasts/${row.forecastPublicId}`)).text();
      const proof=registry?.[row.forecastPublicId];
      if(registry){
        requireValue(proof,`Missing expected proof: ${row.forecastPublicId}`);
        requireValue(json.proofEnvelope.proofs.some(p=>p.status==='verified' && p.id===proof.attestationUID && p.network===proof.network && p.transactionHash===proof.transactionHash),`Public JSON proof not visible yet: ${row.forecastPublicId}`);
        for(const html of [canonical,short])requireValue(html.includes(proof.attestationUID),`Public proof link not visible yet: ${row.forecastPublicId}`);
      }
      return {forecastPublicId:row.forecastPublicId,receiptDigest:row.receiptDigest,urls:3,proofVisible:Boolean(proof)};
    })));
  }
  return {baseUrl,planDigest:plan.planDigest,checkedAt:new Date().toISOString(),forecasts:checks.length,urls:checks.length*3,checks};
}
