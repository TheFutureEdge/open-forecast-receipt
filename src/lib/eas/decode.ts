import { decodeAbiParameters, type Hex } from "viem";
import type { DecodedAttestation } from "../../types/eas";
import { EAS_SCHEMA_PARAMETERS } from "./encode";

function toSafeNumber(value: bigint | number, name: string): number {
  const numberValue = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(`${name} exceeds JavaScript's safe integer range`);
  }
  return numberValue;
}

/** Decode Solidity ABI bytes for the complete 17-field OFR EAS projection. */
export function decodeAttestationData(data: Hex): DecodedAttestation {
  const fields = decodeAbiParameters(EAS_SCHEMA_PARAMETERS, data);
  return {
    subjectRef: fields[0],
    runNumber: toSafeNumber(fields[1], "runNumber"),
    runRevision: toSafeNumber(fields[2], "runRevision"),
    forecastId: fields[3],
    forecasterId: fields[4],
    forecasterLabel: fields[5],
    forecastCreatedAt: toSafeNumber(fields[6], "forecastCreatedAt"),
    anchorAt: toSafeNumber(fields[7], "anchorAt"),
    anchorValueMicros: toSafeNumber(fields[8], "anchorValueMicros"),
    target: fields[9],
    anchorUnit: fields[10],
    classification: fields[11],
    retrospective: fields[12],
    cadenceMonths: toSafeNumber(fields[13], "cadenceMonths"),
    pointCount: toSafeNumber(fields[14], "pointCount"),
    stepReturnBps: fields[15],
    receiptDigest: fields[16],
  };
}
