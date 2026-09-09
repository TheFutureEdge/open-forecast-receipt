import { collection, doc, getDoc } from "firebase/firestore";
import { getLibraryFirestore } from "../firebase/client";
import { catalogCollectionPath } from "./catalog-path";

let generation: Promise<string | null> | undefined;
// Keep client-only browsing on one version. SSR pagination passes its own ID.
export function getCatalogGenerationClient(): Promise<string | null> {
  if (!generation) {
    generation = getDoc(doc(getLibraryFirestore(), "public_catalog_state", "current")).then(snapshot => {
      if (!snapshot.exists()) return null;
      const id = snapshot.data().activeGenerationId;
      if (typeof id !== "string") throw new Error("Invalid active catalog pointer");
      catalogCollectionPath("public_collections", id);
      return id as string;
    });
    generation.catch(() => { generation = undefined; });
  }
  return generation;
}

export async function getCatalogCollectionClient(name: string, generationId?: string | null) {
  const id = generationId === undefined ? await getCatalogGenerationClient() : generationId;
  return collection(getLibraryFirestore(), catalogCollectionPath(name, id));
}
