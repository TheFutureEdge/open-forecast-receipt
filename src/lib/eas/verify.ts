import {
  createPublicClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import type { ChainAttestation, ChainVerificationResult } from "../../types/eas";
import {
  CHAIN_CAIP2,
  getEasNetwork,
  EAS_CONTRACT,
  EAS_SCHEMA_UID,
} from "./constants";
import { decodeAttestationData } from "./decode";

const EAS_READ_ABI = [
  {
    type: "function",
    name: "getAttestation",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schema", type: "bytes32" },
          { name: "time", type: "uint64" },
          { name: "expirationTime", type: "uint64" },
          { name: "revocationTime", type: "uint64" },
          { name: "refUID", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "attester", type: "address" },
          { name: "revocable", type: "bool" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
  },
] as const;

export function normalizeHex(value: string | null | undefined): string | null {
  return value ? value.toLowerCase() : null;
}

export function isValidBytes32(value: string | null | undefined): value is Hex {
  if (!value) return false;
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function verifyAttestationRecord(
  attestation: ChainAttestation,
  expectedUid: Hex,
  computedDigest: string
): ChainVerificationResult {
  if (normalizeHex(attestation.uid) !== normalizeHex(expectedUid)) {
    return { status: "unavailable", failureReason: "attestation_uid_mismatch" };
  }

  if (normalizeHex(attestation.schema) !== normalizeHex(EAS_SCHEMA_UID)) {
    return { status: "unavailable", failureReason: "schema_uid_mismatch" };
  }

  let decoded;
  if (attestation.time <= 0n || attestation.expirationTime !== 0n || attestation.revocable) {
    return { status: "unavailable", failureReason: "attestation_policy_mismatch" };
  }
  try {
    decoded = decodeAttestationData(attestation.data);
  } catch {
    return { status: "unavailable", failureReason: "attestation_data_invalid" };
  }

  const onchainDigest = decoded.receiptDigest.slice(2).toLowerCase();
  if (onchainDigest !== computedDigest.toLowerCase()) {
    return {
      status: "unavailable",
      failureReason: "payload_digest_mismatch",
      attestedDigest: onchainDigest,
    };
  }

  if (attestation.revocationTime > 0n) {
    return {
      status: "revoked",
      failureReason: "attestation_revoked",
      attestedDigest: onchainDigest,
      blockTimestamp: Number(attestation.time),
      attester: attestation.attester,
      schemaUid: attestation.schema,
    };
  }

  return {
    status: "verified",
    attestedDigest: onchainDigest,
    blockTimestamp: Number(attestation.time),
    attester: attestation.attester,
    schemaUid: attestation.schema,
  };
}

export async function verifyChain(
  attestationUID: string | null | undefined,
  computedDigest: string | undefined,
  network: string = CHAIN_CAIP2,
  expectedAttester?: string
): Promise<ChainVerificationResult> {
  if (!attestationUID) return { status: "not_issued" };
  if (!isValidBytes32(attestationUID)) {
    return { status: "unavailable", failureReason: "attestation_uid_invalid" };
  }
  if (!computedDigest || !/^[0-9a-f]{64}$/.test(computedDigest)) {
    return { status: "unavailable", failureReason: "payload_digest_invalid" };
  }

  try {
    const configuration = getEasNetwork(network);
    const publicClient = createPublicClient({
      chain: configuration.chainId === 8453 ? base : baseSepolia,
      transport: http(configuration.rpcUrl, { timeout: 10_000, retryCount: 1 }),
    });
    if (await publicClient.getChainId() !== configuration.chainId) {
      return { status: "unavailable", failureReason: "chain_id_mismatch" };
    }
    const attestation = await publicClient.readContract({
      address: EAS_CONTRACT as Address,
      abi: EAS_READ_ABI,
      functionName: "getAttestation",
      args: [attestationUID],
    });
    if (expectedAttester && normalizeHex(attestation.attester) !== normalizeHex(expectedAttester)) {
      return { status: "unavailable", failureReason: "attester_mismatch" };
    }
    return verifyAttestationRecord(attestation, attestationUID, computedDigest);
  } catch {
    return { status: "unavailable", failureReason: "rpc_unavailable" };
  }
}
