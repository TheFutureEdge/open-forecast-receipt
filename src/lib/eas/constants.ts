/**
 * EAS constants — Base Sepolia configuration.
 * Default values usable before real attestation UIDs exist.
 */
export const EAS_CONTRACT = "0x4200000000000000000000000000000000000021";
export const CHAIN_ID = 84532; // Base Sepolia
export const CHAIN_NAME = "Base Sepolia";
export const BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
export const BASE_SEPOLIA_EAS_EXPLORER_URL = "https://base-sepolia.easscan.org";

export const EAS_SCHEMA =
  "string subjectRef,uint32 runNumber,uint16 runRevision,bytes32 forecastId,bytes32 forecasterId,string forecasterLabel,uint64 forecastCreatedAt,uint64 anchorAt,uint64 anchorValueMicros,string target,string anchorUnit,string classification,bool retrospective,uint8 cadenceMonths,uint8 pointCount,string stepReturnBps,bytes32 receiptDigest";

export const EAS_SCHEMA_UID: `0x${string}` | null = null; // null until registered
