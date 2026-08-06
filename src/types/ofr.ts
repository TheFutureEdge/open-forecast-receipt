export interface OfrModel {
  provider: string;
  organization?: string;
  name: string;
  apiIdentifier?: string;
  specId?: string;
  versionId?: string;
  versionName?: string;
  releaseDate?: string;
}

export interface OfrForecast {
  forecastId: string;
  run: {
    runId: string;
    runNumber?: number;
    revision?: number;
  };
  subject: {
    type: string;
    id: string;
    name: string;
    identifiers?: Record<string, string>;
  };
  target: {
    name: string;
    kind: string;
    quantity: string;
    unit: string;
    transformation: string;
    baseQuantity?: string;
    baseUnit?: string;
    observationDefinition?: string;
    adjustmentPolicy?: string;
  };
  temporal: {
    forecastCreatedAt: string;
    anchorAt: string;
    horizonEndAt: string;
    evaluationEligibleAt: string;
    maturityRule?: string;
    cadence: {
      unit: string;
      value: number;
      count: number;
    };
  };
  anchor?: {
    valueDecimal: string;
    valueScaled?: number;
    scale?: number;
    unit: string;
    observedAt: string;
    source?: string;
    timezone?: string;
    marketSession?: string;
    adjustmentBasis?: string;
  };
  prediction: {
    representation: string;
    valueType: string;
    unit: string;
    points: Array<{
      step: number;
      validAt: string;
      value: number;
      lower?: number;
      upper?: number;
      probability?: number;
      quantile?: number;
    }>;
  };
  classification?: {
    scheme: string;
    value: string;
  };
  forecaster: {
    type: string;
    id: string;
    name: string;
    role?: string;
    mode?: string;
    model?: OfrModel;
  };
  methodology?: Record<string, unknown>;
  conditions?: string[];
}

export interface OfrTemporalProvenance {
  baseModelKnowledge?: {
    cutoffAt?: string;
    precision: "year" | "month" | "day" | "hour" | "minute" | "second" | "unknown";
    status: "declared" | "inferred" | "unknown";
    source: {
      type: string;
      recordId?: string;
      metadataVersion?: number;
      declaredBy?: string;
      uri?: string;
    };
  };
  suppliedContext: {
    snapshotId?: string;
    digestSha256?: string;
    effectiveAt?: string;
    recordedAt?: string;
    captureStatus: "captured_at_generation" | "reconstructed_backfill" | "unknown";
    components: Array<{
      type: string;
      contentDigestSha256: string;
      coverageStart?: string;
      coverageEnd?: string;
      knowledgeCutoff?: string;
      providerUpdatedAt?: string;
      lineageStatus?: string;
    }>;
  };
  marketState: {
    observedAt: string;
    source?: string;
    timezone?: string;
    marketSession?: string;
    tradingDate?: string;
    currency?: string;
    adjustmentBasis?: string;
  };
  generation: {
    batchSubmittedAt?: string;
    queuedAt?: string;
    requestSubmittedAt: string;
    inferenceStartedAt?: string;
    inferenceCompletedAt?: string;
    responseGeneratedAt: string;
  };
  acquiredEvidence: {
    webSearch: {
      configured: boolean;
      executionStatus: "executed" | "not_executed" | "unknown";
      evidenceManifestStatus: "captured" | "partially_captured" | "not_captured";
    };
  };
  scoringSealedAt?: string;
  releasedAt: string;
  evaluationEligibleAt: string;
}

export interface OfrReceiptPayload {
  receipt: {
    receiptId: string;
    status: "draft" | "issued" | "corrected" | "withdrawn" | "example";
    issuanceMode: "contemporaneous" | "retrospective";
    revisionNumber: number;
    revisionType: "original" | "correction" | "methodology_revision" | "evaluation_update";
    issuedAt: string;
    sealedAt: string;
    supersedesReceiptId?: string;
    supersedesPayloadDigestSha256?: string;
    correctionReason?: string;
  };
  issuer: {
    id: string;
    name: string;
    keyId?: string;
    attesterAddress?: string;
    technicalIdentityMapping?: string;
  };
  forecast: OfrForecast;
  provenance: {
    sourceSystem: string;
    sourcePublication: {
      id: string;
      revision: number;
      digestSha256: string;
      generatedAt: string;
      publishedAt: string;
      correctionReason?: string;
    };
    sourceForecastDigest: string;
    mapping: {
      adapter: string;
      version: string;
      sourceSchema?: string;
      sourceTargetName?: string;
      sourceValueField?: string;
      sourceValueUnit?: string;
      outputValueEncoding?: string;
      sourceForecastDigestScope?: string;
      receiptIdDerivation?: string;
    };
    temporal: OfrTemporalProvenance;
    generationConfiguration: Record<string, unknown>;
    evidence: Array<Record<string, unknown>>;
  };
  disclosure: {
    visibility: "public" | "restricted" | "private";
    license: string;
    disclaimer: string;
    limitations: string[];
  };
  extensions?: Record<string, unknown>;
}

export interface OfrDocument {
  $schema: "https://ipulseai.com/schemas/open-forecast-receipt/v0.1.0/schema.json";
  specVersion: "0.1.0";
  profiles: string[];
  receiptPayload: OfrReceiptPayload;
  proofEnvelope: {
    canonicalization: "RFC8785";
    hashAlgorithm: "SHA-256";
    digestScope: "receiptPayload";
    payloadDigestSha256: string;
    proofs: Array<Record<string, unknown>>;
  };
}

export interface OfrFixture {
  assetSlug: string;
  forecasterLabel: string;
  dataStatus: "fixture_pending" | "loaded";
  document?: OfrDocument;
  projection?: CompactEasProjection;
}

export interface CompactEasProjection {
  projectionVersion: "ofr-market-ai-path-eas-v0.1.0";
  state: "planned_unissued_example" | "issued";
  chain: {
    productionTarget: { name: string; caip2: string };
    hackathonTarget: { name: string; caip2: string };
  };
  eas: {
    contract: string;
    schema: string;
    revocable: boolean;
    recipient: string;
    refUID: string;
  };
  encodedFields: {
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
  };
  protocolSuppliedAfterIssuance: {
    schemaUID: string | null;
    attestationUID: string | null;
    transactionHash: string | null;
    attester: string | null;
    blockTimestamp: number | null;
  };
  encodingSemantics: Record<string, string>;
}
