export function selectIpulseProofCohort(transactions,project,entities) {
  if(entities===undefined)return transactions;
  if(project!=='pulse-staging-e1394')throw new Error('Explicit partial proof scope is allowed only for staging QA');
  const ids=entities.split(',');
  if(!ids.length||ids.some(id=>!id)||new Set(ids).size!==ids.length||ids.some(id=>!transactions.some(tx=>tx.entityId===id)))throw new Error('Declare distinct known staging QA entity IDs');
  return transactions.filter(tx=>ids.includes(tx.entityId));
}
