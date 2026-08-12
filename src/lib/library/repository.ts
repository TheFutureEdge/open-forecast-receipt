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
  PublicCollectionSubjectRecord,
  PublicForecastRecord,
  PublicReceiptRecord,
} from "./types";

function collectionSubjectDocumentId(collectionId: string, routeSlug: string): string {
  return `${collectionId}__${routeSlug}`;
}

export async function getLibraryManifest(collectionId: string): Promise<LibraryManifest | null> {
  const db = getLibraryFirestore();
  const [collectionSnapshot, subjectSnapshots] = await Promise.all([
    getDoc(doc(db, "public_collections", collectionId)),
    getDocs(query(collection(db, "public_collection_subjects"), where("collectionId", "==", collectionId))),
  ]);

  if (!collectionSnapshot.exists()) return null;

  const record = collectionSnapshot.data() as PublicCollectionRecord;
  const assets = subjectSnapshots.docs
    .map((snapshot) => snapshot.data() as PublicCollectionSubjectRecord)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ collectionId: _collectionId, subjectId: _subjectId, sortOrder: _sortOrder, publicationStatus: _publicationStatus, visibility: _visibility, ...asset }) => asset);

  return {
    batchId: record.batchId,
    batchLabel: record.batchLabel,
    description: record.description,
    assets,
    receiptCount: record.receiptCount,
    selectedProofCount: record.selectedProofCount,
    verifiedProofCount: record.verifiedProofCount,
  };
}

export async function getLibrarySubject(
  collectionId: string,
  routeSlug: string,
): Promise<PublicCollectionSubjectRecord | null> {
  const db = getLibraryFirestore();
  const directSnapshot = await getDoc(
    doc(db, "public_collection_subjects", collectionSubjectDocumentId(collectionId, routeSlug)),
  );
  if (directSnapshot.exists()) return directSnapshot.data() as PublicCollectionSubjectRecord;

  const aliasesSnapshot = await getDocs(query(
    collection(db, "public_collection_subjects"),
    where("collectionId", "==", collectionId),
    where("aliases", "array-contains", routeSlug),
  ));
  return aliasesSnapshot.empty
    ? null
    : aliasesSnapshot.docs[0].data() as PublicCollectionSubjectRecord;
}

export async function listLibraryForecasts(
  collectionId: string,
  subjectId: string,
): Promise<PublicForecastRecord[]> {
  const db = getLibraryFirestore();
  const snapshots = await getDocs(query(
    collection(db, "public_forecasts"),
    where("collectionId", "==", collectionId),
    where("subjectId", "==", subjectId),
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

export function getSubjectProofCounts(subject: PublicCollectionSubjectRecord): LibraryShowcaseCounts {
  return {
    selected: subject.showcaseSelectionCount ?? 0,
    verified: subject.proofCount ?? 0,
  };
}
