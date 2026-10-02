// Base mainnet and Sepolia apply EIP-7825's per-transaction gas ceiling.
// Keep a 10% execution reserve without allowing wallet default multipliers
// to turn a valid estimate into a transaction above the protocol cap.
export const BASE_TRANSACTION_GAS_CAP = 16_777_216n;

export function publicationGasLimit(estimate) {
  const gas=BigInt(estimate);
  if(gas<=0n||gas>BASE_TRANSACTION_GAS_CAP)throw new Error('Gas estimate exceeds the Base transaction cap or is invalid; review the complete asset cohort before signing');
  const buffered=(gas*110n+99n)/100n;
  return buffered>BASE_TRANSACTION_GAS_CAP?BASE_TRANSACTION_GAS_CAP:buffered;
}
