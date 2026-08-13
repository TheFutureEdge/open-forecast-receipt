import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  Bank,
  Buildings,
  ChartLineUp,
  CheckCircle,
  Fingerprint,
  GlobeHemisphereWest,
  Receipt,
  Target,
  TrendUp,
  UserCircle,
} from "@phosphor-icons/react";
import { Link } from "../../lib/router";
import { SchemaOrgTypeTag } from "./SchemaOrgTypeTag";

export function KnowledgeGraphConceptDiagram() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white dark:border-slate-800 sm:px-8">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">Knowledge Graph architecture</div>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Identity gives the forecast meaning. The receipt gives it memory.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          The Library keeps the real-world subject separate from the measurable target. A forecaster predicts that subject-target binding, and an Open Forecast Receipt preserves the resulting forecast and its provenance.
        </p>
      </div>

      <div className="grid gap-4 bg-slate-50 p-5 dark:bg-slate-950/40 sm:p-7 xl:grid-cols-[1fr_auto_1fr_auto_1fr] xl:items-stretch">
        <ArchitectureStage
          step="1"
          title="Knowledge Graph"
          description="Stable identities and typed relationships"
          nodes={[
            { Icon: Buildings, eyebrow: "Context entity", title: "Alibaba Group", meta: "Issuer organization", schemaOrgType: "Corporation" },
            { Icon: TrendUp, eyebrow: "Subject entity", title: "BABA ADR", meta: "Listed Security", schemaOrgType: "Thing" },
          ]}
          relationships={["issues"]}
        />
        <StageArrow />
        <ArchitectureStage
          step="2"
          title="Forecast definition"
          description="Exactly what will be predicted"
          nodes={[
            { Icon: Target, eyebrow: "Target definition", title: "Adjusted close return", meta: "Dimension · step-over-step change · Unit · %" },
            { Icon: CheckCircle, eyebrow: "Approved binding", title: "BABA + return target", meta: "Cadence and horizon are versioned" },
          ]}
          relationships={["applies to subject"]}
        />
        <StageArrow />
        <ArchitectureStage
          step="3"
          title="Forecast record"
          description="Who predicted what, when, and with which context"
          nodes={[
            { Icon: UserCircle, eyebrow: "Forecaster profile", title: "AI, algorithm, human, or team", meta: "Produces a forecast" },
            { Icon: ChartLineUp, eyebrow: "Forecast", title: "Predicted values", meta: "References the approved subject-target binding" },
            { Icon: Receipt, eyebrow: "Open Forecast Receipt", title: "Forecast + provenance", meta: "Optionally anchored and later evaluated" },
          ]}
          relationships={["produces", "sealed as"]}
        />
      </div>

      <div className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-3">
        <Outcome Icon={Receipt} label="Receipt" text="Preserves the forecast and its provenance" />
        <Outcome Icon={Fingerprint} label="Proof" text="Confirms integrity and publication timing" />
        <Outcome Icon={ChartLineUp} label="Evaluation" text="Scores the forecast only after the target matures" />
      </div>
    </div>
  );
}

interface ArchitectureNode {
  Icon: typeof Buildings;
  eyebrow: string;
  title: string;
  meta: string;
  schemaOrgType?: string;
}

function ArchitectureStage({
  step,
  title,
  description,
  nodes,
  relationships,
}: {
  step: string;
  title: string;
  description: string;
  nodes: ArchitectureNode[];
  relationships: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{step}</div>
        <div>
          <h3 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {nodes.map(({ Icon, eyebrow, title: nodeTitle, meta, schemaOrgType }, index) => (
          <div key={`${eyebrow}-${nodeTitle}`}>
            {index > 0 && (
              <div className="flex h-7 items-center justify-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <ArrowDown size={12} /> {relationships[index - 1]}
              </div>
            )}
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900 dark:bg-blue-950/25">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} weight="duotone" /></div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-blue-500">{eyebrow}</div>
                <div className="mt-0.5 text-xs font-bold text-slate-950 dark:text-white">{nodeTitle}</div>
                <div className="mt-1 text-[9px] leading-4 text-slate-500 dark:text-slate-400">{meta}</div>
                {schemaOrgType && <SchemaOrgTypeTag value={schemaOrgType} className="mt-2" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StageArrow() {
  return (
    <div className="flex items-center justify-center text-blue-400" aria-hidden="true">
      <ArrowDown className="xl:hidden" size={22} />
      <ArrowRight className="hidden xl:block" size={22} />
    </div>
  );
}

function Outcome({ Icon, label, text }: { Icon: typeof Receipt; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3 bg-white p-4 dark:bg-slate-900">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Icon size={19} weight="duotone" /></div>
      <div>
        <div className="text-xs font-bold text-slate-950 dark:text-white">{label}</div>
        <div className="mt-0.5 text-[10px] leading-4 text-slate-500">{text}</div>
      </div>
    </div>
  );
}

export function KnowledgeGraphExamples() {
  return (
    <div className="grid gap-px bg-slate-200 dark:bg-slate-800 xl:grid-cols-2">
      <RelationshipExample
        eyebrow="Live catalog example"
        icon={<Buildings size={20} weight="duotone" />}
        parentLabel="Issuer organization"
        parentName="Alibaba Group Holding Ltd"
        parentSchemaOrgType="Corporation"
        parentHref="/entities/entity-5d88041e-30a3-5218-af25-9e66758f71c9"
        description="One corporation issues two separately identifiable securities. Both can use the same target definition, but each subject-target binding keeps its own forecast history."
        children={[
          {
            entityName: "Alibaba ordinary shares",
            entityCode: "9988 · Hong Kong",
            entityType: "Listed Security",
            schemaOrgType: "Thing",
            relationship: "issues",
            targetName: "Adjusted end-of-day close return",
            dimension: "Step-over-step percentage change",
            unit: "%",
            href: "/entities/alibaba-9988-hong-kong",
            Icon: TrendUp,
          },
          {
            entityName: "Alibaba ADR",
            entityCode: "BABA · New York",
            entityType: "Listed Security",
            schemaOrgType: "Thing",
            relationship: "issues",
            targetName: "Adjusted end-of-day close return",
            dimension: "Step-over-step percentage change",
            unit: "%",
            href: "/entities/alibaba-baba",
            Icon: TrendUp,
          },
        ]}
      />
      <RelationshipExample
        eyebrow="Illustrative expansion"
        icon={<GlobeHemisphereWest size={20} weight="duotone" />}
        parentLabel="Geographic context"
        parentName="United States"
        parentSchemaOrgType="Country"
        description="Context can connect several forecasts without becoming their target. GDP is measured about the country; the policy-rate target is measured about the Federal Reserve System."
        children={[
          {
            entityName: "United States",
            entityCode: "US",
            entityType: "Country",
            schemaOrgType: "Country",
            relationship: "measures for",
            targetName: "Real GDP growth",
            dimension: "Quarterly · annualized change",
            unit: "%",
            Icon: ChartLineUp,
          },
          {
            entityName: "Federal Reserve System",
            entityCode: "United States",
            entityType: "Central Bank",
            schemaOrgType: "GovernmentOrganization",
            relationship: "has institution",
            targetName: "Federal funds target rate",
            dimension: "Policy rate level",
            unit: "%",
            Icon: Bank,
          },
        ]}
      />
    </div>
  );
}

interface RelationshipChild {
  entityName: string;
  entityCode: string;
  entityType: string;
  schemaOrgType: string;
  relationship: string;
  targetName: string;
  dimension: string;
  unit: string;
  href?: string;
  Icon: typeof TrendUp;
}

function RelationshipExample({
  eyebrow,
  icon,
  parentLabel,
  parentName,
  parentSchemaOrgType,
  parentHref,
  description,
  children,
}: {
  eyebrow: string;
  icon: ReactNode;
  parentLabel: string;
  parentName: string;
  parentSchemaOrgType: string;
  parentHref?: string;
  description: string;
  children: RelationshipChild[];
}) {
  const parentContent = (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-left dark:border-blue-900 dark:bg-blue-950/30">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">{icon}</div>
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-500">{parentLabel}</div>
        <div className="mt-0.5 truncate text-sm font-bold text-slate-950 dark:text-white">{parentName}</div>
        <SchemaOrgTypeTag value={parentSchemaOrgType} className="mt-2" />
      </div>
      {parentHref && <ArrowRight className="ml-auto shrink-0 text-blue-400" size={15} />}
    </div>
  );

  return (
    <article className="bg-white p-6 dark:bg-slate-900 sm:p-7">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</div>
      <div className="mt-3">{parentHref ? <Link to={parentHref}>{parentContent}</Link> : parentContent}</div>
      <div className="mx-auto h-5 w-px bg-blue-200 dark:bg-blue-900" aria-hidden="true" />
      <div className="relative grid gap-2 sm:grid-cols-2 before:absolute before:-top-5 before:left-1/4 before:right-1/4 before:hidden before:h-5 before:rounded-t-xl before:border-x before:border-t before:border-blue-200 sm:before:block dark:before:border-blue-900">
        {children.map(({ entityName, entityCode, entityType, schemaOrgType, relationship, targetName, dimension, unit, href, Icon }) => {
          const content = (
            <div className="relative h-full overflow-hidden rounded-xl border border-emerald-200 bg-white transition-colors hover:border-emerald-400 dark:border-emerald-900 dark:bg-slate-900">
              <div className="flex min-h-[9.25rem] flex-col bg-emerald-50/70 p-3.5 dark:bg-emerald-950/20">
                <div className="mb-2 text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Subject entity</div>
                <div className="flex items-start gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon size={17} weight="duotone" /></div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-950 dark:text-white">{entityName}</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">{entityCode}</div>
                  </div>
                </div>
                <div className="mt-auto grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 pt-3 text-[9px] font-semibold">
                  <span className="truncate rounded-full bg-emerald-100 px-2 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" title={entityType}>{entityType}</span>
                  <SchemaOrgTypeTag value={schemaOrgType} />
                </div>
              </div>
              <div className="border-t border-emerald-200/70 p-3.5 dark:border-emerald-900">
                <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">Forecast target</div>
                <div className="mt-1 text-[11px] font-bold leading-4 text-slate-900 dark:text-white">{targetName}</div>
                <dl className="mt-2 space-y-1.5 text-[9px] leading-4">
                  <div>
                    <dt className="text-slate-400">Dimension</dt>
                    <dd className="font-semibold text-slate-600 dark:text-slate-300">{dimension}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-400">Unit</dt>
                    <dd className="font-semibold text-slate-600 dark:text-slate-300">{unit}</dd>
                  </div>
                </dl>
                <div className="mt-2 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Forecast-ready</div>
              </div>
            </div>
          );
          const connectedContent = (
            <div className="relative h-full pt-8">
              <div className="absolute inset-x-0 top-0 flex h-8 items-center justify-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em] text-blue-600 dark:text-blue-300">
                <ArrowDown size={13} weight="bold" /> {relationship}
              </div>
              {content}
            </div>
          );
          return href ? <Link key={entityName} to={href}>{connectedContent}</Link> : <div key={`${entityName}-${targetName}`}>{connectedContent}</div>;
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}
