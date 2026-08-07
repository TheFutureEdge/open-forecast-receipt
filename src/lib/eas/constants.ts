import type { Address, Hex } from "viem";
import config from "../../data/eas-base-sepolia.json";

/** Base Sepolia deployment and deterministic OFR schema configuration. */
export const EAS_CONTRACT = config.contracts.eas as Address;
export const EAS_SCHEMA_REGISTRY_CONTRACT = config.contracts.schemaRegistry as Address;
export const CHAIN_ID = config.network.chainId;
export const CHAIN_NAME = config.network.name;
export const CHAIN_CAIP2 = config.network.caip2;
export const BASE_SEPOLIA_RPC_URL = config.network.rpcUrl;
export const BASE_SEPOLIA_BLOCK_EXPLORER_URL = config.network.blockExplorerUrl;
export const BASE_SEPOLIA_EAS_EXPLORER_URL = config.network.easExplorerUrl;
export const EAS_SCHEMA = config.schema;

/**
 * Schema UIDs are deterministic from schema + resolver + revocability. This
 * expected UID can therefore be verified before the schema registration
 * transaction exists; registration state remains a separate onchain fact.
 */
export const EAS_SCHEMA_UID = config.schemaUid as Hex;

export function getEasAttestationUrl(attestationUid: string): string {
  return `${BASE_SEPOLIA_EAS_EXPLORER_URL}/attestation/view/${attestationUid}`;
}

export function getBaseTransactionUrl(transactionHash: string): string {
  return `${BASE_SEPOLIA_BLOCK_EXPLORER_URL}/tx/${transactionHash}`;
}
