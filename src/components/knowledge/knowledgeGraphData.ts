export type KnowledgeNodeKind =
  | "context_entity"
  | "subject_entity"
  | "target_definition"
  | "target_binding"
  | "forecaster"
  | "forecast"
  | "receipt"
  | "proof"
  | "evaluation";

export interface KnowledgeGraphViewNode {
  id: string;
  kind: KnowledgeNodeKind;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  schemaOrgType?: string;
  dimension?: string;
  unit?: string;
  position: { x: number; y: number };
}

export interface KnowledgeGraphViewEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  optional?: boolean;
}

export const knowledgeGraphViewNodes: KnowledgeGraphViewNode[] = [
  {
    id: "org-alibaba",
    kind: "context_entity",
    eyebrow: "Context entity",
    title: "Alibaba Group",
    subtitle: "Issuer organization",
    description: "The issuer organization supplies real-world context but remains a separate identity from each listed security.",
    schemaOrgType: "Corporation",
    position: { x: 0, y: 20 },
  },
  {
    id: "security-baba",
    kind: "subject_entity",
    eyebrow: "Subject entity",
    title: "BABA ADR",
    subtitle: "Listed Security",
    description: "The stable market-instrument entity that the forecast is about. Its ticker may change without changing this identity.",
    schemaOrgType: "Thing",
    position: { x: 230, y: 20 },
  },
  {
    id: "target-return",
    kind: "target_definition",
    eyebrow: "Target definition",
    title: "Adjusted close return",
    subtitle: "Reusable measurement contract",
    description: "A reusable, versioned definition of the measurable quantity, including its dimension, unit, cadence, and resolution policy.",
    dimension: "Step-over-step change",
    unit: "%",
    position: { x: 0, y: 190 },
  },
  {
    id: "binding-baba-return",
    kind: "target_binding",
    eyebrow: "Approved target binding",
    title: "BABA + return target",
    subtitle: "Subject + target + horizon",
    description: "The governed combination that defines exactly what a forecast may predict for this subject.",
    position: { x: 230, y: 190 },
  },
  {
    id: "forecaster-profile",
    kind: "forecaster",
    eyebrow: "Forecaster profile",
    title: "AI, human, or algorithm",
    subtitle: "Publisher-governed identity",
    description: "The actor that produces the forecast. Its model, configuration, organization, and review lineage remain explicit.",
    position: { x: 0, y: 380 },
  },
  {
    id: "forecast",
    kind: "forecast",
    eyebrow: "Forecast",
    title: "Predicted values",
    subtitle: "One forecaster · one binding",
    description: "The predicted values for the approved subject-target binding, with a defined creation time and horizon.",
    position: { x: 230, y: 380 },
  },
  {
    id: "receipt",
    kind: "receipt",
    eyebrow: "Open Forecast Receipt",
    title: "Forecast + provenance",
    subtitle: "Canonical JSON · SHA-256",
    description: "The portable record that seals the forecast together with forecaster identity, temporal boundaries, evidence, and provenance.",
    position: { x: 460, y: 300 },
  },
  {
    id: "proof",
    kind: "proof",
    eyebrow: "Optional proof",
    title: "Blockchain attestation",
    subtitle: "Integrity and timing",
    description: "An optional onchain anchor for the receipt digest. It does not prove the forecast is true or accurate.",
    position: { x: 460, y: 30 },
  },
  {
    id: "evaluation",
    kind: "evaluation",
    eyebrow: "Evaluation",
    title: "Observed outcome",
    subtitle: "Only after maturity",
    description: "The governed comparison between the forecast and the observed outcome after the target becomes resolvable.",
    position: { x: 460, y: 500 },
  },
];

export const knowledgeGraphViewEdges: KnowledgeGraphViewEdge[] = [
  { id: "org-issues-security", source: "org-alibaba", target: "security-baba", label: "issues" },
  { id: "security-subject-of-binding", source: "security-baba", target: "binding-baba-return", label: "subject of" },
  { id: "target-defines-binding", source: "target-return", target: "binding-baba-return", label: "defines" },
  { id: "binding-scopes-forecast", source: "binding-baba-return", target: "forecast", label: "defines scope" },
  { id: "forecaster-produces-forecast", source: "forecaster-profile", target: "forecast", label: "produces" },
  { id: "forecast-sealed-as-receipt", source: "forecast", target: "receipt", label: "sealed as" },
  { id: "receipt-anchored-by-proof", source: "receipt", target: "proof", label: "optionally anchored by", optional: true },
  { id: "forecast-scored-by-evaluation", source: "forecast", target: "evaluation", label: "scored after maturity" },
];
