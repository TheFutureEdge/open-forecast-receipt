import { describe, expect, it } from "vitest";
import { entityDirectoryItemForWeb, entityForWeb, knowledgeGraphIdentifierForWeb } from "../../lib/library/entityPresentation";
import type { PublicEntityDirectoryItem, PublicEntityRecord } from "../../lib/library/types";

describe("web entity identifier presentation", () => {
  it("namespaces both Google identifier families without changing other values", () => {
    expect(knowledgeGraphIdentifierForWeb("/m/0vlf")).toBe("kg:/m/0vlf");
    expect(knowledgeGraphIdentifierForWeb("/g/11fx8vn85y")).toBe("kg:/g/11fx8vn85y");
    for (const value of ["kg:/m/0vlf", "Q11463", "https://www.adobe.com/", "/entities/corporations/adobe", "/m/"]) {
      expect(knowledgeGraphIdentifierForWeb(value)).toBe(value);
    }
  });

  it("projects existing directory catalogs before serialization and keeps MID search working", () => {
    const source = { entityId: "adobe", searchTerms: ["google_knowledge_graph_mid", "/m/0vlf", "ADBE:NASDAQ"] } as PublicEntityDirectoryItem;
    const projected = entityDirectoryItemForWeb(source);
    expect(JSON.stringify(projected)).not.toContain('"/m/0vlf"');
    expect(projected.searchTerms.some((value) => value.includes("/m/0vlf"))).toBe(true);
    expect(source.searchTerms).toEqual(["google_knowledge_graph_mid", "/m/0vlf", "ADBE:NASDAQ"]);
  });

  it("preserves authoritative entity data while projecting detail props and JSON-LD values", () => {
    const source = {
      entityId: "adobe",
      externalIdentifiers: [
        { scheme: "google_knowledge_graph_mid", value: "/m/0vlf" },
        { scheme: "wikidata", value: "Q11463", canonicalUri: "https://www.wikidata.org/entity/Q11463" },
      ],
    } as PublicEntityRecord;
    const before = JSON.stringify(source);
    const projected = entityForWeb(source);
    expect(JSON.stringify(projected)).not.toContain('"/m/0vlf"');
    expect(projected.externalIdentifiers[0].value).toBe("kg:/m/0vlf");
    expect(projected.externalIdentifiers[1]).toEqual(source.externalIdentifiers[1]);
    expect(entityForWeb(projected)).toEqual(projected);
    expect(JSON.stringify(source)).toBe(before);
  });
});
