import "server-only";
import { cache } from "react";
import { getLibraryServerFirestore } from "../firestore/server";
import { catalogCollectionPath } from "./catalog-path";

// Request-scoped memoization pins all catalog reads in one SSR render.
export const getCatalogGenerationServer = cache(async (): Promise<string | null> => {
  const db = getLibraryServerFirestore();
  const pointer = await db.doc("public_catalog_state/current").get();
  if (!pointer.exists) return null;
  const id = pointer.data()?.activeGenerationId;
  if (typeof id !== "string") throw new Error("Invalid active catalog pointer");
  catalogCollectionPath("public_collections", id);
  const generation = await db.doc(`public_catalog_generations/${id}`).get();
  if (generation.data()?.status !== "ready") throw new Error("Active catalog generation is not ready");
  return id;
});

export async function getCatalogCollectionServer(name: string, generationId?: string | null) {
  const id = generationId === undefined ? await getCatalogGenerationServer() : generationId;
  return getLibraryServerFirestore().collection(catalogCollectionPath(name, id));
}
