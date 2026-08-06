import {
  encodeAbiParameters,
  parseAbiParameters,
  type Hex,
} from "viem";
import type { DecodedAttestation } from "../../types/eas";
import { EAS_SCHEMA } from "./constants";

export const EAS_SCHEMA_PARAMETERS = parseAbiParameters(EAS_SCHEMA);

function assertUnsignedInteger(value: number, name: string, max: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new Error(`${name} must be an unsigned integer between 0 and ${max}`);
  }
}

function assertBytes32(value: string, name: string): asserts value is Hex {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${name} must be a 0x-prefixed 32-byte hexadecimal value`);
  }
}

/** Encode the complete 17-field OFR EAS projection as Solidity ABI bytes. */
export function encodeAttestationData(decoded: DecodedAttestation): Hex {
  assertUnsignedInteger(decoded.runNumber, "runNumber", 0xffffffff);
  assertUnsignedInteger(decoded.runRevision, "runRevision", 0xffff);
  assertUnsignedInteger(decoded.forecastCreatedAt, "forecastCreatedAt", Number.MAX_SAFE_INTEGER);
  assertUnsignedInteger(decoded.anchorAt, "anchorAt", Number.MAX_SAFE_INTEGER);
  assertUnsignedInteger(decoded.anchorValueMicros, "anchorValueMicros", Number.MAX_SAFE_INTEGER);
  assertUnsignedInteger(decoded.cadenceMonths, "cadenceMonths", 0xff);
  assertUnsignedInteger(decoded.pointCount, "pointCount", 0xff);
  assertBytes32(decoded.forecastId, "forecastId");
  assertBytes32(decoded.forecasterId, "forecasterId");
  assertBytes32(decoded.receiptDigest, "receiptDigest");

  return encodeAbiParameters(EAS_SCHEMA_PARAMETERS, [
    decoded.subjectRef,
    decoded.runNumber,
    decoded.runRevision,
    decoded.forecastId,
    decoded.forecasterId,
    decoded.forecasterLabel,
    BigInt(decoded.forecastCreatedAt),
    BigInt(decoded.anchorAt),
    BigInt(decoded.anchorValueMicros),
    decoded.target,
    decoded.anchorUnit,
    decoded.classification,
    decoded.retrospective,
    decoded.cadenceMonths,
    decoded.pointCount,
    decoded.stepReturnBps,
    decoded.receiptDigest,
  ]);
}
