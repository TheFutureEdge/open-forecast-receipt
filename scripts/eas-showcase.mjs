#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { canonicalize } from "json-canonicalize";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  formatEther,
  getAddress,
  http,
  keccak256,
  parseAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { estimateContractTotalFee } from "viem/op-stack";

const ROOT = resolve(import.meta.dirname, "..");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_UID = `0x${"00".repeat(32)}`;
const WRITE_GUARD = "I_UNDERSTAND_THIS_WRITES_TO_BASE_SEPOLIA";
const ARTIFACT_PATH = "artifacts/base-sepolia/batch6-showcase-attestations.json";
const ISSUANCE_INTENT_PATH = "artifacts/base-sepolia/batch6-showcase-issuance-intent.json";

const SCHEMA_REGISTRY_ABI = [
  {
    type: "function",
    name: "getSchema",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [{
      name: "",
      type: "tuple",
      components: [
        { name: "uid", type: "bytes32" },
        { name: "resolver", type: "address" },
        { name: "revocable", type: "bool" },
        { name: "schema", type: "string" },
      ],
    }],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schema", type: "string" },
      { name: "resolver", type: "address" },
      { name: "revocable", type: "bool" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "event",
    name: "Registered",
    anonymous: false,
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "registerer", type: "address", indexed: true },
      {
        name: "schema",
        type: "tuple",
        indexed: false,
        components: [
          { name: "uid", type: "bytes32" },
          { name: "resolver", type: "address" },
          { name: "revocable", type: "bool" },
          { name: "schema", type: "string" },
        ],
      },
    ],
  },
];

const EAS_ABI = [
  {
    type: "function",
    name: "multiAttest",
    stateMutability: "payable",
    inputs: [{
      name: "multiRequests",
      type: "tuple[]",
      components: [
        { name: "schema", type: "bytes32" },
        {
          name: "data",
          type: "tuple[]",
          components: [
            { name: "recipient", type: "address" },
            { name: "expirationTime", type: "uint64" },
            { name: "revocable", type: "bool" },
            { name: "refUID", type: "bytes32" },
            { name: "data", type: "bytes" },
            { name: "value", type: "uint256" },
          ],
        },
      ],
    }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    type: "function",
    name: "getAttestation",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [{
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
    }],
  },
  {
    type: "event",
    name: "Attested",
    anonymous: false,
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "attester", type: "address", indexed: true },
      { name: "uid", type: "bytes32", indexed: false },
      { name: "schemaUID", type: "bytes32", indexed: true },
    ],
  },
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(ROOT, relativePath), "utf8"));
}

async function writeJson(relativePath, value) {
  const absolutePath = resolve(ROOT, relativePath);
  const temporaryPath = `${absolutePath}.${process.pid}.tmp`;
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, absolutePath);
}

async function pathExists(relativePath) {
  try {
    await access(resolve(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeHex(value) {
  return String(value || "").toLowerCase();
}

function toIsoFromSeconds(value) {
  return new Date(Number(value) * 1_000).toISOString();
}

function getPrivateKey() {
  const value = String(process.env.OFR_BASE_SEPOLIA_PRIVATE_KEY || "").trim();
  if (!value) return null;
  assert(/^0x[0-9a-fA-F]{64}$/.test(value), "OFR_BASE_SEPOLIA_PRIVATE_KEY must be a 0x-prefixed 32-byte key");
  return value;
}

function getFeeCeilingWei(required = false) {
  const value = String(process.env.OFR_MAX_TOTAL_FEE_WEI || "").trim();
  if (!value) {
    assert(!required, "Set OFR_MAX_TOTAL_FEE_WEI before an approved write.");
    return null;
  }
  assert(/^\d+$/.test(value), "OFR_MAX_TOTAL_FEE_WEI must be a positive integer in wei");
  const ceiling = BigInt(value);
  assert(ceiling > 0n, "OFR_MAX_TOTAL_FEE_WEI must be greater than zero");
  return ceiling;
}

function assertFeeWithinCeiling(estimatedTotalFeeWei) {
  const ceiling = getFeeCeilingWei(true);
  assert(
    estimatedTotalFeeWei <= ceiling,
    `Estimated total Base fee ${estimatedTotalFeeWei} wei exceeds OFR_MAX_TOTAL_FEE_WEI=${ceiling}`,
  );
  return ceiling;
}

function getPublicExplorerBaseUrl() {
  const rawValue = String(process.env.OFR_PUBLIC_EXPLORER_BASE_URL || "").trim();
  assert(rawValue, "Set OFR_PUBLIC_EXPLORER_BASE_URL to the reviewed, live explorer URL before metadata sync");
  const parsed = new URL(rawValue);
  assert(parsed.protocol === "https:", "OFR_PUBLIC_EXPLORER_BASE_URL must use HTTPS");
  assert(!parsed.username && !parsed.password, "OFR_PUBLIC_EXPLORER_BASE_URL cannot contain credentials");
  assert(!parsed.search && !parsed.hash, "OFR_PUBLIC_EXPLORER_BASE_URL cannot contain a query or fragment");
  return rawValue.replace(/\/+$/, "");
}

function requireWriteApproval(submit) {
  assert(submit, "No transaction was sent. Re-run with --submit after reviewing the preflight.");
  assert(
    process.env.OFR_ALLOW_BASE_SEPOLIA_WRITE === WRITE_GUARD,
    `Set OFR_ALLOW_BASE_SEPOLIA_WRITE=${WRITE_GUARD} before an approved testnet write.`,
  );
  const privateKey = getPrivateKey();
  assert(privateKey, "A dedicated testnet-only OFR_BASE_SEPOLIA_PRIVATE_KEY is required.");
  return privateKey;
}

function encodeProjection(fields, parameters) {
  return encodeAbiParameters(parameters, [
    fields.subjectRef,
    fields.runNumber,
    fields.runRevision,
    fields.forecastId,
    fields.forecasterId,
    fields.forecasterLabel,
    BigInt(fields.forecastCreatedAt),
    BigInt(fields.anchorAt),
    BigInt(fields.anchorValueMicros),
    fields.target,
    fields.anchorUnit,
    fields.classification,
    fields.retrospective,
    fields.cadenceMonths,
    fields.pointCount,
    fields.stepReturnBps,
    fields.receiptDigest,
  ]);
}

async function loadContext() {
  const [config, selection, catalog, schema] = await Promise.all([
    readJson("src/data/eas-base-sepolia.json"),
    readJson("src/data/fixtures/batch6-showcase-selection.json"),
    readJson("src/data/fixtures/batch6-catalog.json"),
    readJson("schema/open_forecast_receipt_v0_1.schema.json"),
  ]);
  const rpcUrl = String(process.env.OFR_BASE_SEPOLIA_RPC_URL || config.network.rpcUrl).trim();
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl, { timeout: 15_000, retryCount: 2 }),
  });
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const parameters = parseAbiParameters(config.schema);
  const computedSchemaUid = keccak256(encodePacked(
    ["string", "address", "bool"],
    [config.schema, config.resolver, config.revocable],
  ));
  assert(config.network.chainId === baseSepolia.id, "Configured chain ID is not Base Sepolia");
  assert(config.network.caip2 === `eip155:${baseSepolia.id}`, "Configured CAIP-2 network is not Base Sepolia");
  assert(normalizeHex(computedSchemaUid) === normalizeHex(config.schemaUid), "Configured EAS schema UID is not the deterministic schema UID");
  assert(selection.receipts.length === 6, "The Phase 1 showcase must contain exactly six receipts");
  assert(new Set(selection.receipts.map((item) => item.receiptDigest)).size === 6, "Showcase receipt digests must be unique");

  const rows = [];
  for (const selected of selection.receipts) {
    const entry = catalog.entries.find((candidate) => candidate.receiptDigest === selected.receiptDigest);
    assert(entry, `Showcase receipt is missing from the catalog: ${selected.receiptDigest}`);
    assert(entry.assetSlug === selected.assetSlug, `Asset mismatch for ${selected.receiptDigest}`);
    assert(entry.mode === selected.mode, `Advisor mode mismatch for ${selected.receiptDigest}`);
    const documentPath = `src/data/fixtures/${entry.documentPath.replace(/^\.\//, "")}`;
    const projectionPath = `src/data/fixtures/${entry.projectionPath.replace(/^\.\//, "")}`;
    const [document, projection] = await Promise.all([readJson(documentPath), readJson(projectionPath)]);
    assert(validate(document), `OFR schema validation failed for ${entry.forecastId}: ${ajv.errorsText(validate.errors)}`);
    const computedDigest = sha256(canonicalize(document.receiptPayload));
    assert(computedDigest === entry.receiptDigest, `Catalog digest mismatch for ${entry.forecastId}`);
    assert(computedDigest === document.proofEnvelope.payloadDigestSha256, `Receipt digest mismatch for ${entry.forecastId}`);
    assert(normalizeHex(projection.encodedFields.receiptDigest) === `0x${computedDigest}`, `Projection digest mismatch for ${entry.forecastId}`);
    assert(projection.eas.schema === config.schema, `Projection schema mismatch for ${entry.forecastId}`);
    assert(normalizeHex(projection.eas.contract) === normalizeHex(config.contracts.eas), `EAS contract mismatch for ${entry.forecastId}`);
    assert(projection.eas.revocable === config.revocable, `Revocability mismatch for ${entry.forecastId}`);
    const encodedData = encodeProjection(projection.encodedFields, parameters);
    rows.push({
      ...entry,
      document,
      projection,
      documentPath,
      projectionPath,
      encodedData,
      dataBytes: (encodedData.length - 2) / 2,
    });
  }

  const multiRequests = [{
    schema: config.schemaUid,
    data: rows.map((row) => ({
      recipient: config.recipient,
      expirationTime: 0n,
      revocable: config.revocable,
      refUID: config.refUid,
      data: row.encodedData,
      value: 0n,
    })),
  }];
  const calldata = encodeFunctionData({
    abi: EAS_ABI,
    functionName: "multiAttest",
    args: [multiRequests],
  });
  return {
    config,
    selection,
    catalog,
    publicClient,
    rows,
    multiRequests,
    calldataBytes: (calldata.length - 2) / 2,
    rpcUrl,
  };
}

async function getChainState(context) {
  const { config, publicClient } = context;
  const [chainId, easCode, registryCode, schemaRecord] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getCode({ address: config.contracts.eas }),
    publicClient.getCode({ address: config.contracts.schemaRegistry }),
    publicClient.readContract({
      address: config.contracts.schemaRegistry,
      abi: SCHEMA_REGISTRY_ABI,
      functionName: "getSchema",
      args: [config.schemaUid],
    }),
  ]);
  assert(chainId === config.network.chainId, `RPC chain ID ${chainId} is not Base Sepolia ${config.network.chainId}`);
  assert(easCode && easCode !== "0x", "No EAS contract bytecode found at the configured address");
  assert(registryCode && registryCode !== "0x", "No SchemaRegistry bytecode found at the configured address");
  const schemaRegistered = normalizeHex(schemaRecord.uid) === normalizeHex(config.schemaUid);
  if (schemaRegistered) {
    assert(schemaRecord.schema === config.schema, "Registered schema text does not match the OFR schema");
    assert(normalizeHex(schemaRecord.resolver) === normalizeHex(config.resolver), "Registered schema resolver mismatch");
    assert(schemaRecord.revocable === config.revocable, "Registered schema revocability mismatch");
  }
  return { chainId, schemaRecord, schemaRegistered };
}

function getOptionalAccount() {
  const privateKey = getPrivateKey();
  if (privateKey) return privateKeyToAccount(privateKey);
  const address = String(process.env.OFR_ATTESTER_ADDRESS || "").trim();
  return address ? { address: getAddress(address) } : null;
}

async function preflight() {
  const context = await loadContext();
  const chainState = await getChainState(context);
  const account = getOptionalAccount();
  const estimationAddress = account?.address || "0x1111111111111111111111111111111111111111";
  const registerGas = chainState.schemaRegistered
    ? null
    : await context.publicClient.estimateContractGas({
      address: context.config.contracts.schemaRegistry,
      abi: SCHEMA_REGISTRY_ABI,
      functionName: "register",
      args: [context.config.schema, context.config.resolver, context.config.revocable],
      account: estimationAddress,
    });
  const registerTotalFee = chainState.schemaRegistered
    ? null
    : await estimateContractTotalFee(context.publicClient, {
      address: context.config.contracts.schemaRegistry,
      abi: SCHEMA_REGISTRY_ABI,
      functionName: "register",
      args: [context.config.schema, context.config.resolver, context.config.revocable],
      account: estimationAddress,
    });
  let attestGas = null;
  let attestTotalFee = null;
  if (chainState.schemaRegistered) {
    [attestGas, attestTotalFee] = await Promise.all([
      context.publicClient.estimateContractGas({
        address: context.config.contracts.eas,
        abi: EAS_ABI,
        functionName: "multiAttest",
        args: [context.multiRequests],
        account: estimationAddress,
        value: 0n,
      }),
      estimateContractTotalFee(context.publicClient, {
        address: context.config.contracts.eas,
        abi: EAS_ABI,
        functionName: "multiAttest",
        args: [context.multiRequests],
        account: estimationAddress,
        value: 0n,
      }),
    ]);
  }
  const balance = account
    ? await context.publicClient.getBalance({ address: account.address })
    : null;
  const output = {
    writePerformed: false,
    network: context.config.network,
    rpcUrl: context.rpcUrl,
    contracts: context.config.contracts,
    schema: {
      uid: context.config.schemaUid,
      registered: chainState.schemaRegistered,
      revocable: context.config.revocable,
      estimatedRegistrationGas: registerGas?.toString() || null,
      estimatedRegistrationTotalFeeWei: registerTotalFee?.toString() || null,
      estimatedRegistrationTotalFeeEth: registerTotalFee === null ? null : formatEther(registerTotalFee),
    },
    cohort: {
      id: context.selection.cohortId,
      policy: context.selection.selectionPolicy,
      receiptCount: context.rows.length,
      encodedDataBytes: context.rows.reduce((total, row) => total + row.dataBytes, 0),
      multiAttestCalldataBytes: context.calldataBytes,
      estimatedMultiAttestGas: attestGas?.toString() || null,
      estimatedTotalFeeWei: attestTotalFee?.toString() || null,
      estimatedTotalFeeEth: attestTotalFee === null ? null : formatEther(attestTotalFee),
      configuredFeeCeilingWei: getFeeCeilingWei(false)?.toString() || null,
      receipts: context.rows.map((row) => ({
        assetSlug: row.assetSlug,
        forecasterLabel: row.forecasterLabel,
        mode: row.mode,
        receiptDigest: row.receiptDigest,
        encodedDataBytes: row.dataBytes,
      })),
    },
    signer: account ? {
      address: account.address,
      balanceWei: balance.toString(),
      balanceEth: formatEther(balance),
    } : null,
    nextAction: chainState.schemaRegistered
      ? "After explicit approval, run npm run eas:showcase:issue -- --submit."
      : "After explicit approval, register the schema first with npm run eas:schema:register -- --submit.",
  };
  console.log(JSON.stringify(output, null, 2));
}

async function registerSchema(submit) {
  const privateKey = requireWriteApproval(submit);
  const context = await loadContext();
  const chainState = await getChainState(context);
  if (chainState.schemaRegistered) {
    console.log(JSON.stringify({ writePerformed: false, reason: "schema_already_registered", schemaUid: context.config.schemaUid }, null, 2));
    return;
  }
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(context.rpcUrl) });
  const estimatedTotalFee = await estimateContractTotalFee(context.publicClient, {
    address: context.config.contracts.schemaRegistry,
    abi: SCHEMA_REGISTRY_ABI,
    functionName: "register",
    args: [context.config.schema, context.config.resolver, context.config.revocable],
    account,
  });
  assertFeeWithinCeiling(estimatedTotalFee);
  const simulation = await context.publicClient.simulateContract({
    address: context.config.contracts.schemaRegistry,
    abi: SCHEMA_REGISTRY_ABI,
    functionName: "register",
    args: [context.config.schema, context.config.resolver, context.config.revocable],
    account,
  });
  assert(normalizeHex(simulation.result) === normalizeHex(context.config.schemaUid), "Schema simulation returned an unexpected UID");
  const transactionHash = await walletClient.writeContract(simulation.request);
  const receipt = await context.publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 1 });
  assert(receipt.status === "success", `Schema registration reverted: ${transactionHash}`);
  const event = receipt.logs
    .filter((log) => normalizeHex(log.address) === normalizeHex(context.config.contracts.schemaRegistry))
    .map((log) => {
      try {
        return decodeEventLog({ abi: SCHEMA_REGISTRY_ABI, data: log.data, topics: log.topics });
      } catch {
        return null;
      }
    })
    .find((decoded) => decoded?.eventName === "Registered");
  assert(event && normalizeHex(event.args.uid) === normalizeHex(context.config.schemaUid), "Registered event did not contain the expected schema UID");
  assert(normalizeHex(event.args.registerer) === normalizeHex(account.address), "Registered event signer mismatch");
  const confirmedState = await getChainState(context);
  assert(confirmedState.schemaRegistered, "Schema was not readable from SchemaRegistry after confirmation");
  const block = await context.publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const artifact = {
    formatVersion: "ofr-eas-schema-registration-v1",
    network: context.config.network,
    schemaUid: context.config.schemaUid,
    schema: context.config.schema,
    resolver: context.config.resolver,
    revocable: context.config.revocable,
    registrant: account.address,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    blockTimestamp: Number(block.timestamp),
    blockTimestampIso: toIsoFromSeconds(block.timestamp),
  };
  await writeJson("artifacts/base-sepolia/schema-registration.json", artifact);
  console.log(JSON.stringify({ writePerformed: true, artifact: "artifacts/base-sepolia/schema-registration.json", ...artifact }, null, 2));
}

function decodeAttestedEvents(receipt, easAddress) {
  return receipt.logs
    .filter((log) => normalizeHex(log.address) === normalizeHex(easAddress))
    .map((log) => {
      try {
        return decodeEventLog({ abi: EAS_ABI, data: log.data, topics: log.topics });
      } catch {
        return null;
      }
    })
    .filter((event) => event?.eventName === "Attested");
}

async function verifyAttestation(context, row, uid, suppliedAttestation = null) {
  const attestation = suppliedAttestation || await context.publicClient.readContract({
    address: context.config.contracts.eas,
    abi: EAS_ABI,
    functionName: "getAttestation",
    args: [uid],
  });
  assert(normalizeHex(attestation.uid) === normalizeHex(uid), `Attestation UID mismatch for ${row.receiptDigest}`);
  assert(normalizeHex(attestation.schema) === normalizeHex(context.config.schemaUid), `Schema UID mismatch for ${row.receiptDigest}`);
  assert(normalizeHex(attestation.data) === normalizeHex(row.encodedData), `Encoded data mismatch for ${row.receiptDigest}`);
  assert(normalizeHex(attestation.recipient) === normalizeHex(context.config.recipient), `Recipient mismatch for ${row.receiptDigest}`);
  assert(normalizeHex(attestation.refUID) === normalizeHex(context.config.refUid), `Reference UID mismatch for ${row.receiptDigest}`);
  assert(attestation.expirationTime === 0n, `Unexpected expiration for ${row.receiptDigest}`);
  assert(attestation.time > 0n, `Attestation has no block timestamp for ${row.receiptDigest}`);
  assert(attestation.revocable === context.config.revocable, `Revocability mismatch for ${row.receiptDigest}`);
  assert(attestation.revocationTime === 0n, `Attestation is revoked for ${row.receiptDigest}`);
  return attestation;
}

async function issueShowcase(submit) {
  const privateKey = requireWriteApproval(submit);
  assert(
    !(await pathExists(ARTIFACT_PATH)) && !(await pathExists(ISSUANCE_INTENT_PATH)),
    `A showcase artifact or issuance intent already exists. Run verification or recover the recorded transaction instead of issuing duplicates.`,
  );
  const context = await loadContext();
  const chainState = await getChainState(context);
  assert(chainState.schemaRegistered, `Schema ${context.config.schemaUid} is not registered yet`);
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(context.rpcUrl) });
  const estimatedTotalFee = await estimateContractTotalFee(context.publicClient, {
    address: context.config.contracts.eas,
    abi: EAS_ABI,
    functionName: "multiAttest",
    args: [context.multiRequests],
    account,
    value: 0n,
  });
  assertFeeWithinCeiling(estimatedTotalFee);
  const simulation = await context.publicClient.simulateContract({
    address: context.config.contracts.eas,
    abi: EAS_ABI,
    functionName: "multiAttest",
    args: [context.multiRequests],
    account,
    value: 0n,
  });
  assert(Array.isArray(simulation.result) && simulation.result.length === context.rows.length, "Showcase simulation did not return six attestation UIDs");
  const intent = {
    formatVersion: "ofr-eas-showcase-issuance-intent-v1",
    status: "prepared",
    cohortId: context.selection.cohortId,
    network: context.config.network,
    schemaUid: context.config.schemaUid,
    attester: account.address,
    receiptDigests: context.rows.map((row) => row.receiptDigest),
    transactionHash: null,
  };
  await writeJson(ISSUANCE_INTENT_PATH, intent);
  const transactionHash = await walletClient.writeContract(simulation.request);
  await writeJson(ISSUANCE_INTENT_PATH, {
    ...intent,
    status: "submitted",
    transactionHash,
  });
  const receipt = await context.publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 1 });
  assert(receipt.status === "success", `Showcase multiAttest reverted: ${transactionHash}`);
  const events = decodeAttestedEvents(receipt, context.config.contracts.eas);
  assert(events.length === context.rows.length, `Expected ${context.rows.length} Attested events, received ${events.length}`);
  const proofByDigest = new Map();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const uid = event.args.uid;
    assert(normalizeHex(event.args.schemaUID) === normalizeHex(context.config.schemaUid), `Attested event schema mismatch at index ${index}`);
    assert(normalizeHex(event.args.attester) === normalizeHex(account.address), `Attested event signer mismatch at index ${index}`);
    const attestation = await context.publicClient.readContract({
      address: context.config.contracts.eas,
      abi: EAS_ABI,
      functionName: "getAttestation",
      args: [uid],
    });
    const row = context.rows.find(
      (candidate) => normalizeHex(candidate.encodedData) === normalizeHex(attestation.data),
    );
    assert(row, `Attested event ${uid} does not match any selected receipt payload`);
    assert(!proofByDigest.has(row.receiptDigest), `Duplicate attested payload for ${row.receiptDigest}`);
    await verifyAttestation(context, row, uid, attestation);
    proofByDigest.set(row.receiptDigest, {
      assetSlug: row.assetSlug,
      forecasterLabel: row.forecasterLabel,
      mode: row.mode,
      forecastId: row.forecastId,
      receiptDigest: row.receiptDigest,
      documentPath: row.documentPath,
      projectionPath: row.projectionPath,
      schemaUID: context.config.schemaUid,
      attestationUID: uid,
      transactionHash,
      attester: attestation.attester,
      blockTimestamp: Number(attestation.time),
      blockTimestampIso: toIsoFromSeconds(attestation.time),
      encodedDataBytes: row.dataBytes,
    });
  }
  const proofs = context.rows.map((row) => proofByDigest.get(row.receiptDigest));
  assert(proofs.every(Boolean), "At least one selected receipt was not attested");
  const artifact = {
    formatVersion: "ofr-eas-showcase-attestations-v1",
    cohortId: context.selection.cohortId,
    selectionDeclaredAt: context.selection.declaredAt,
    selectionPolicy: context.selection.selectionPolicy,
    network: context.config.network,
    contracts: context.config.contracts,
    schemaUid: context.config.schemaUid,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    receiptCount: proofs.length,
    receipts: proofs,
  };
  await writeJson(ARTIFACT_PATH, artifact);
  await writeJson(ISSUANCE_INTENT_PATH, {
    ...intent,
    status: "verified",
    transactionHash,
    receiptCount: proofs.length,
  });
  console.log(JSON.stringify({ writePerformed: true, artifact: ARTIFACT_PATH, transactionHash, receiptCount: proofs.length, attestations: proofs }, null, 2));
}

async function loadAndVerifyArtifact(context) {
  const artifact = await readJson(ARTIFACT_PATH);
  assert(artifact.cohortId === context.selection.cohortId, "Proof artifact cohort does not match the showcase selection");
  assert(artifact.network?.caip2 === context.config.network.caip2, "Proof artifact network mismatch");
  assert(normalizeHex(artifact.schemaUid) === normalizeHex(context.config.schemaUid), "Proof artifact schema mismatch");
  assert(/^0x[0-9a-fA-F]{64}$/.test(artifact.transactionHash), "Proof artifact transaction hash is invalid");
  assert(Array.isArray(artifact.receipts) && artifact.receipts.length === context.rows.length, "Proof artifact receipt count mismatch");
  assert(new Set(artifact.receipts.map((proof) => proof.attestationUID)).size === context.rows.length, "Proof artifact attestation UIDs must be unique");
  for (const row of context.rows) {
    const proof = artifact.receipts.find((candidate) => candidate.receiptDigest === row.receiptDigest);
    assert(proof, `Proof artifact is missing ${row.receiptDigest}`);
    assert(proof.assetSlug === row.assetSlug && proof.forecastId === row.forecastId, `Proof artifact identity mismatch for ${row.receiptDigest}`);
    assert(proof.transactionHash === artifact.transactionHash, `Proof artifact transaction mismatch for ${row.receiptDigest}`);
    assert(normalizeHex(proof.schemaUID) === normalizeHex(context.config.schemaUid), `Proof artifact schema mismatch for ${row.receiptDigest}`);
    const attestation = await verifyAttestation(context, row, proof.attestationUID);
    assert(normalizeHex(attestation.attester) === normalizeHex(proof.attester), `Artifact attester mismatch for ${row.receiptDigest}`);
    assert(Number(attestation.time) === proof.blockTimestamp, `Artifact block timestamp mismatch for ${row.receiptDigest}`);
  }
  return artifact;
}

async function verifyShowcase() {
  const context = await loadContext();
  await getChainState(context);
  const artifact = await loadAndVerifyArtifact(context);
  console.log(JSON.stringify({ verified: true, network: context.config.network.caip2, cohortId: artifact.cohortId, receiptCount: artifact.receipts.length, transactionHash: artifact.transactionHash }, null, 2));
}

async function syncVerifiedProofs() {
  const context = await loadContext();
  const artifact = await loadAndVerifyArtifact(context);
  const publicExplorerBaseUrl = getPublicExplorerBaseUrl();
  const pendingWrites = [];
  for (const row of context.rows) {
    const proof = artifact.receipts.find((candidate) => candidate.receiptDigest === row.receiptDigest);
    assert(proof, `Verified proof is missing ${row.receiptDigest}`);
    const document = structuredClone(row.document);
    const projection = structuredClone(row.projection);
    const easProof = {
      type: "eas_attestation",
      status: "verified",
      id: proof.attestationUID,
      network: context.config.network.caip2,
      schemaUid: proof.schemaUID,
      transactionHash: proof.transactionHash,
      attester: proof.attester,
      blockTimestamp: proof.blockTimestampIso,
      revoked: false,
      verifierVersion: "ofr-eas-verifier-v0.1.0",
    };
    document.proofEnvelope.proofs = [
      ...document.proofEnvelope.proofs.filter((item) => !(item.type === "eas_attestation" && item.network === context.config.network.caip2)),
      easProof,
    ];
    const digestAfterProof = sha256(canonicalize(document.receiptPayload));
    assert(digestAfterProof === row.receiptDigest, `Proof-envelope update changed the sealed digest for ${row.receiptDigest}`);
    projection.state = "issued";
    projection.protocolSuppliedAfterIssuance = {
      schemaUID: proof.schemaUID,
      attestationUID: proof.attestationUID,
      transactionHash: proof.transactionHash,
      attester: proof.attester,
      blockTimestamp: proof.blockTimestamp,
    };
    pendingWrites.push([row.documentPath, document]);
    pendingWrites.push([row.projectionPath, projection]);

    const catalogEntry = context.catalog.entries.find((candidate) => candidate.receiptDigest === row.receiptDigest);
    assert(catalogEntry, `Catalog entry is missing ${row.receiptDigest}`);
    catalogEntry.chainStatus = "verified";
    catalogEntry.schemaUID = proof.schemaUID;
    catalogEntry.attestationUID = proof.attestationUID;
    catalogEntry.transactionHash = proof.transactionHash;
    catalogEntry.attester = proof.attester;
    catalogEntry.blockTimestamp = proof.blockTimestamp;
  }

  const manifest = await readJson("src/data/fixtures/batch6-manifest.json");
  for (const asset of manifest.assets) {
    const selectedCount = context.selection.receipts.filter((item) => item.assetSlug === asset.slug).length;
    const proofCount = artifact.receipts.filter((item) => item.assetSlug === asset.slug).length;
    asset.showcaseSelectionCount = selectedCount;
    asset.proofCount = proofCount;
    asset.chainStatus = proofCount > 0 ? "verified" : "not_issued";
  }
  pendingWrites.push(["src/data/fixtures/batch6-catalog.json", context.catalog]);
  pendingWrites.push(["src/data/fixtures/batch6-manifest.json", manifest]);

  const catalogReceiptSummaries = manifest.assets.map((asset) => {
    const selectedRows = context.rows.filter((row) => row.assetSlug === asset.slug);
    const assetIds = new Set(selectedRows.map((row) => row.assetId));
    assert(selectedRows.length > 0, `No selected receipt exists for ${asset.slug}`);
    assert(assetIds.size === 1, `Selected receipts do not resolve to one stable asset ID for ${asset.slug}`);
    const verifiedReceiptCount = artifact.receipts.filter(
      (proof) => proof.assetSlug === asset.slug,
    ).length;
    assert(verifiedReceiptCount === selectedRows.length, `Not every selected receipt verified for ${asset.slug}`);
    return {
      asset_id: [...assetIds][0],
      scoring_batch: 6,
      summary: {
        status: "complete",
        network: context.config.network.caip2,
        schema_uid: context.config.schemaUid,
        issuance_mode: context.selection.issuanceMode,
        selected_receipt_count: selectedRows.length,
        verified_receipt_count: verifiedReceiptCount,
        manifest_url: `${publicExplorerBaseUrl}/manifest/${context.selection.batchId}/assets/${asset.slug}`,
      },
    };
  });
  pendingWrites.push([
    "artifacts/base-sepolia/ipulse-catalog-open-forecast-receipts.json",
    {
      format_version: "ipulse-open-forecast-receipt-catalog-handoff-v1",
      verified_at_utc: new Date().toISOString(),
      generated_from_transaction: artifact.transactionHash,
      network: context.config.network.caip2,
      schema_uid: context.config.schemaUid,
      receipts: catalogReceiptSummaries,
    },
  ]);

  const canonical = context.rows.find((row) => row.receiptDigest === "85e82d474841f0497fb7f6fcb0a7fec7ce808de9779ff69eff32a6b6560ea4a5");
  if (canonical) {
    const canonicalDocument = pendingWrites.find(([path]) => path === canonical.documentPath)?.[1];
    const canonicalProjection = pendingWrites.find(([path]) => path === canonical.projectionPath)?.[1];
    pendingWrites.push(["examples/ipulse/pepsi_batch6_ray_open_forecast_receipt_v0_1.json", canonicalDocument]);
    pendingWrites.push(["examples/ipulse/pepsi_batch6_ray_onchain_projection_v0_1.json", canonicalProjection]);
  }

  for (const [path, value] of pendingWrites) await writeJson(path, value);
  console.log(JSON.stringify({
    synced: true,
    filesWritten: pendingWrites.length,
    receiptCount: artifact.receipts.length,
    catalogHandoff: "artifacts/base-sepolia/ipulse-catalog-open-forecast-receipts.json",
  }, null, 2));
}

const [command = "preflight", ...flags] = process.argv.slice(2);
const submit = flags.includes("--submit");

try {
  if (command === "preflight") await preflight();
  else if (command === "register") await registerSchema(submit);
  else if (command === "issue") await issueShowcase(submit);
  else if (command === "verify") await verifyShowcase();
  else if (command === "sync") await syncVerifiedProofs();
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
