export interface ChainVerificationResult {
  status: "verified" | "revoked" | "unavailable" | "not_issued";
  failureReason?: string;
  attestedDigest?: string;
  blockTimestamp?: number;
  attester?: string;
  schemaUid?: string;
}

export interface ChainAttestation {
  uid: `0x${string}`;
  schema: `0x${string}`;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  refUID: `0x${string}`;
  recipient: `0x${string}`;
  attester: `0x${string}`;
  revocable: boolean;
  data: `0x${string}`;
}

export interface DecodedAttestation {
  subjectRef: string;
  runNumber: number;
  runRevision: number;
  forecastId: string;
  forecasterId: string;
  forecasterLabel: string;
  forecastCreatedAt: number;
  anchorAt: number;
  anchorValueMicros: number;
  target: string;
  anchorUnit: string;
  classification: string;
  retrospective: boolean;
  cadenceMonths: number;
  pointCount: number;
  stepReturnBps: string;
  receiptDigest: string;
}
