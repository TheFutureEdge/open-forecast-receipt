import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getLibraryFirestore } from "../firebase/client";
import type {
  LibraryManifest,
  LibraryReceipt,
  LibraryShowcaseCounts,
  PublicCollectionRecord,
  PublicCollectionEntityRecord,
  PublicEntityRecord,
  PublicForecastRecord,
  PublicForecasterRecord,
  PublicReceiptRecord,
} from "./types";

export async function listPublicForecasters(): Promise<PublicForecasterRecord[]> {
  const snapshots = await getDocs(collection(getLibraryFirestore(), "public_forecasters"));
  return snapshots.docs
    .map((snapshot) => snapshot.data() as PublicForecasterRecord)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export async function listPublicForecasts(): Promise<PublicForecastRecord[]> {
  const snapshots = await getDocs(collection(getLibraryFirestore(), "public_forecasts"));
  return snapshots.docs.map((snapshot) => snapshot.data() as PublicForecastRecord);
}

async function listPublicEntitiesByClass(entityClass: string): Promise<PublicEntityRecord[]> {
  const snapshots = await getDocs(query(
    collection(getLibraryFirestore(), "public_entities"),
    where("entityClasses", "array-contains", entityClass),
  ));
  return snapshots.docs
    .map((snapshot) => snapshot.data() as PublicEntityRecord)
    .sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
}

export function listPublicForecastableEntities(): Promise<PublicEntityRecord[]> {
  return listPublicEntitiesByClass("forecastable_entity");
}

export function listPublicOrganizations(): Promise<PublicEntityRecord[]> {
  return listPublicEntitiesByClass("organization");
}

export async function getPublicEntity(routeKey: string): Promise<PublicEntityRecord | null> {
  const db = getLibraryFirestore();
  const directSnapshot = await getDoc(doc(db, "public_entities", routeKey));
  if (directSnapshot.exists()) return directSnapshot.data() as PublicEntityRecord;

  const slugSnapshots = await getDocs(query(
    collection(db, "public_entities"),
    where("stableSlug", "==", routeKey),
  ));
  return slugSnapshots.empty
    ? null
    : slugSnapshots.docs[0].data() as PublicEntityRecord;
}

export async function listEntityCollections(entityId: string): Promise<PublicCollectionEntityRecord[]> {
  const snapshots = await getDocs(query(
    collection(getLibraryFirestore(), "public_collection_entities"),
    where("entityId", "==", entityId),
  ));
  return snapshots.docs.map((snapshot) => snapshot.data() as PublicCollectionEntityRecord);
}

function collectionEntityDocumentId(collectionId: string, routeSlug: string): string {
  return `${collectionId}__${routeSlug}`;
}

export async function getLibraryManifest(collectionId: string): Promise<LibraryManifest | null> {
  const db = getLibraryFirestore();
  const [collectionSnapshot, entitySnapshots] = await Promise.all([
    getDoc(doc(db, "public_collections", collectionId)),
    getDocs(query(collection(db, "public_collection_entities"), where("collectionId", "==", collectionId))),
  ]);

  if (!collectionSnapshot.exists()) return null;

  const record = collectionSnapshot.data() as PublicCollectionRecord;
  const entities = entitySnapshots.docs
    .map((snapshot) => snapshot.data() as PublicCollectionEntityRecord)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ collectionId: _collectionId, entityId: _entityId, sortOrder: _sortOrder, publicationStatus: _publicationStatus, visibility: _visibility, ...entity }) => entity);

  return {
    batchId: record.batchId,
    batchLabel: record.batchLabel,
    description: record.description,
    entities,
    receiptCount: record.receiptCount,
    selectedProofCount: record.selectedProofCount,
    verifiedProofCount: record.verifiedProofCount,
  };
}

export async function getLibraryEntity(
  collectionId: string,
  routeSlug: string,
): Promise<PublicCollectionEntityRecord | null> {
  const db = getLibraryFirestore();
  const directSnapshot = await getDoc(
    doc(db, "public_collection_entities", collectionEntityDocumentId(collectionId, routeSlug)),
  );
  if (directSnapshot.exists()) return directSnapshot.data() as PublicCollectionEntityRecord;

  const aliasesSnapshot = await getDocs(query(
    collection(db, "public_collection_entities"),
    where("collectionId", "==", collectionId),
    where("aliases", "array-contains", routeSlug),
  ));
  return aliasesSnapshot.empty
    ? null
    : aliasesSnapshot.docs[0].data() as PublicCollectionEntityRecord;
}

export async function listLibraryForecasts(
  collectionId: string,
  entityId: string,
): Promise<PublicForecastRecord[]> {
  const db = getLibraryFirestore();
  const snapshots = await getDocs(query(
    collection(db, "public_forecasts"),
    where("collectionId", "==", collectionId),
    where("entityId", "==", entityId),
  ));
  return snapshots.docs
    .map((snapshot) => snapshot.data() as PublicForecastRecord)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function getLibraryReceipt(receiptDigest: string): Promise<LibraryReceipt | null> {
  const snapshot = await getDoc(doc(getLibraryFirestore(), "public_receipts", receiptDigest));
  if (!snapshot.exists()) return null;
  const record = snapshot.data() as PublicReceiptRecord;
  return { document: record.document, projection: record.projection };
}

export function getManifestProofCounts(manifest: LibraryManifest): LibraryShowcaseCounts {
  return {
    selected: manifest.selectedProofCount,
    verified: manifest.verifiedProofCount,
  };
}

export function getEntityProofCounts(entity: PublicCollectionEntityRecord): LibraryShowcaseCounts {
  return {
    selected: entity.showcaseSelectionCount ?? 0,
    verified: entity.proofCount ?? 0,
  };
}
