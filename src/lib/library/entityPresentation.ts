import type { PublicEntityDirectoryItem, PublicEntityRecord } from "./types";

// Google uses kg:/m/... identifiers in its JSON-LD API. Namespace bare MIDs
// before serializing web props so crawlers do not resolve them on this site.
// This is a presentation projection, never a storage or receipt mutation.
export function knowledgeGraphIdentifierForWeb(value: string): string {
  return /^\/(?:m|g)\/[A-Za-z0-9_]+$/.test(value) ? `kg:${value}` : value;
}

export function entityDirectoryItemForWeb(entity: PublicEntityDirectoryItem): PublicEntityDirectoryItem {
  return {
    ...entity,
    searchTerms: (entity.searchTerms || []).map(knowledgeGraphIdentifierForWeb),
  };
}

export function entityForWeb(entity: PublicEntityRecord): PublicEntityRecord {
  if (!entity.externalIdentifiers) return entity;
  return {
    ...entity,
    externalIdentifiers: entity.externalIdentifiers.map((identifier) => (
      identifier.scheme === "google_knowledge_graph_mid"
        ? { ...identifier, value: knowledgeGraphIdentifierForWeb(identifier.value) }
        : identifier
    )),
  };
}
