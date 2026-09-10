export type DataStatus = "fixture_pending" | "loaded" | "invalid";

export type IntegrityStatus = "not_checked" | "pass" | "fail";

export type ChainStatus =
  | "not_issued"
  | "pending"
  | "verified"
  | "revoked"
  | "unavailable";

export type CoverageStatus = "none" | "partial" | "complete";

export type ChainFailureReason =
  | "chain_id_mismatch"
  | "eas_contract_mismatch"
  | "schema_uid_mismatch"
  | "attestation_uid_invalid"
  | "attestation_uid_mismatch"
  | "attestation_data_invalid"
  | "payload_digest_invalid"
  | "payload_digest_mismatch"
  | "attestation_revoked"
  | "attestation_policy_mismatch"
  | "attester_mismatch"
  | "rpc_unavailable";

export type LocalFailureReason =
  | "malformed_json"
  | "schema_validation_failed"
  | "digest_mismatch"
  | "fixture_not_loaded";

export type FailureReasonType = LocalFailureReason | ChainFailureReason;

export interface VerificationResult {
  dataStatus: DataStatus;
  integrityStatus: IntegrityStatus;
  chainStatus: ChainStatus;
  computedDigest?: string;
  documentDigest?: string;    // payloadDigestSha256 from proofEnvelope
  onchainDigest?: string;     // receiptDigest from EAS (when available)
  failureReason?: FailureReasonType;
  failureDetails?: string;
  schemaErrors?: string[];
  isRetrospective: boolean;   // informational, not a failure
  temporalInfo?: {
    forecastCreatedAt: string;
    sourcePublishedAt: string | null;
    chainBlockTimestamp: number | null;
  };
}
