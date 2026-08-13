import { KnowledgeGraphTag } from "./KnowledgeGraphTag";

export function SchemaOrgTypeTag({ value, className = "" }: { value: string; className?: string }) {
  return (
    <KnowledgeGraphTag
      kind="schema"
      className={`justify-self-start ${className}`}
      title={`Schema.org: ${value}`}
    >
      {value}
    </KnowledgeGraphTag>
  );
}
