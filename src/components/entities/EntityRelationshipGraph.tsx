import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Buildings, ChartLineUp } from "@phosphor-icons/react";
import "@xyflow/react/dist/style.css";
import type { PublicEntityRecord, PublicRelatedEntity } from "../../lib/library/types";
import { Link, navigate } from "../../lib/router";
import { SchemaOrgTypeTag } from "../knowledge/SchemaOrgTypeTag";
import { EntityLogo } from "./EntityLogo";
import { publicEntityPath, publicRelatedEntityPath } from "../../lib/library/entityRoutes";

type RelationshipNodeData = Record<string, unknown> & {
  name: string;
  slug: string;
  entityType: string;
  identifier?: string;
  logoUrl?: string;
  schemaOrgType?: string;
  primary: boolean;
  forecastable: boolean;
  path: string;
};

type RelationshipNode = Node<RelationshipNodeData, "relationship">;

function humanize(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function relationshipLabel(predicate: PublicRelatedEntity["predicate"]): string {
  if (predicate === "has_market_representation") return "has market representation";
  if (predicate === "is_market_representation_of") return "represents organization";
  return "listed or quoted on";
}

function tickerFromValue(value?: string): string | undefined {
  if (!value) return undefined;
  const ticker = value.split(/[:.]/, 1)[0]?.trim();
  return ticker ? ticker.toUpperCase() : undefined;
}

function entityTicker(entity: PublicEntityRecord): string | undefined {
  if (entity.entityType !== "listed_security") return undefined;
  const identifiers = entity.externalIdentifiers || [];
  const preferredSchemes = ["ticker_symbol", "ticker_mic", "ticker_venue", "ipulse_symbol"];
  for (const scheme of preferredSchemes) {
    const value = identifiers.find((identifier) => identifier.scheme === scheme)?.value;
    const ticker = tickerFromValue(value);
    if (ticker) return ticker;
  }
  return undefined;
}

function createGraph(entity: PublicEntityRecord): { nodes: RelationshipNode[]; edges: Edge[]; height: number } {
  const related = entity.relatedEntities || [];
  const currentForecastable = entity.entityClasses?.includes("forecastable_entity") || false;
  const currentTicker = currentForecastable ? entityTicker(entity) : undefined;
  const columns = related.length > 3 ? 2 : 1;
  const rows = Math.max(1, Math.ceil(related.length / columns));
  const nodes: RelationshipNode[] = [{
    id: entity.entityId,
    type: "relationship",
    position: { x: 40, y: Math.max(45, rows * 72 - 40) },
    data: {
      name: currentTicker || entity.canonicalName,
      slug: entity.stableSlug,
      entityType: entity.entityType,
      identifier: currentTicker ? entity.canonicalName : undefined,
      logoUrl: entity.logo?.url,
      schemaOrgType: entity.schemaOrgTypes[0] || "Thing",
      primary: true,
      forecastable: currentForecastable,
      path: publicEntityPath(entity),
    },
  }];
  const edges: Edge[] = [];

  related.forEach((record, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const nodeId = `${record.predicate}-${record.entityId}`;
    const relatedForecastable = record.predicate === "has_market_representation";
    const relatedTicker = relatedForecastable
      ? record.schemaTickerSymbol || tickerFromValue(record.displayIdentifier)
      : undefined;
    const sharesGovernedBrand = record.predicate === "is_market_representation_of"
      || record.predicate === "has_market_representation";
    nodes.push({
      id: nodeId,
      type: "relationship",
      position: { x: 440 + (column * 300), y: 25 + (row * 145) },
      data: {
        name: relatedTicker || record.canonicalName,
        slug: record.stableSlug,
        entityType: record.entityType,
        identifier: relatedTicker ? record.canonicalName : record.displayIdentifier,
        logoUrl: record.logoUrl || (sharesGovernedBrand ? entity.logo?.url : undefined),
        schemaOrgType: record.entityType === "corporation" ? "Corporation" : "Thing",
        primary: false,
        forecastable: relatedForecastable,
        path: publicRelatedEntityPath(record),
      },
    });
    edges.push({
      id: `edge-${nodeId}`,
      source: entity.entityId,
      target: nodeId,
      label: relationshipLabel(record.predicate),
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#2563eb" },
      style: { stroke: "#2563eb", strokeWidth: 1.5 },
      labelStyle: { fill: "#1d4ed8", fontSize: 10, fontWeight: 700 },
      labelBgStyle: { fill: "#eff6ff", fillOpacity: 0.96 },
      labelBgPadding: [7, 4],
      labelBgBorderRadius: 7,
    });
  });

  return { nodes, edges, height: Math.max(260, rows * 145 + 60) };
}

const nodeTypes = { relationship: RelationshipGraphNode };

/** Show the governed entity and its direct relationships as a draggable, zoomable graph. */
export function EntityRelationshipGraph({ entity }: { entity: PublicEntityRecord }) {
  const graph = useMemo(() => createGraph(entity), [entity]);
  const underlyingEntity = entity.relatedEntities?.find((record) => record.predicate === "is_market_representation_of");
  const [nodes, setNodes, onNodesChange] = useNodesState<RelationshipNode>(graph.nodes);

  useEffect(() => setNodes(graph.nodes), [graph.nodes, setNodes]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Relationship graph</h2>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">2D · draggable</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">The blue forecastable node can receive forecast targets. Green context nodes explain who issues, owns, or hosts it.</p>
        {underlyingEntity && (
          <p className="mt-2 text-xs leading-5 text-blue-700 dark:text-blue-300">
            Organization identifiers are kept on the separate underlying entity. {" "}
            <Link to={publicRelatedEntityPath(underlyingEntity)} className="font-semibold underline underline-offset-2">
              View {underlyingEntity.canonicalName}
            </Link>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-[0.1em]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            <span className="size-2 rounded-full bg-blue-600" /> Forecastable entity
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-500" /> Context entity
          </span>
        </div>
      </div>
      <div style={{ height: graph.height }} className="bg-slate-50 dark:bg-slate-950/40">
        <ReactFlow
          nodes={nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => navigate(node.data.path)}
          nodesDraggable
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.18, duration: 350 }}
          minZoom={0.45}
          maxZoom={1.65}
          proOptions={{ hideAttribution: true }}
          aria-label={`Relationship graph for ${entity.canonicalName}`}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}

function RelationshipGraphNode({ data, selected }: NodeProps<RelationshipNode>) {
  const Icon = data.forecastable ? ChartLineUp : Buildings;
  const roleLabel = data.forecastable ? "Forecastable entity" : "Context entity";
  return (
    <div className={`w-64 rounded-xl border-2 bg-white p-3 shadow-sm dark:bg-slate-900 ${data.forecastable ? "border-blue-400 shadow-blue-100" : "border-emerald-300"} ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}>
      <Handle type="target" position={Position.Left} className="!size-2 !border-2 !border-white !bg-blue-500" isConnectable={false} />
      <div className="flex min-w-0 cursor-grab items-start gap-3 active:cursor-grabbing">
        {data.logoUrl ? (
          <EntityLogo src={data.logoUrl} alt={`${data.name} logo`} className="size-10" imageClassName="p-1.5" />
        ) : (
          <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${data.forecastable ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
            <Icon size={20} weight="duotone" />
          </div>
        )}
        <div className="min-w-0">
          <div className={`text-[8px] font-black uppercase tracking-[0.13em] ${data.forecastable ? "text-blue-600" : "text-emerald-700"}`}>{roleLabel}</div>
          <div className="mt-0.5 truncate text-xs font-bold text-slate-950 dark:text-white">{data.name}</div>
          {data.identifier && <div className="mt-0.5 truncate text-[9px] text-slate-500">{data.identifier}</div>}
          {data.primary && <div className="mt-0.5 text-[8px] font-semibold text-slate-400">Current page</div>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{humanize(data.entityType)}</span>
            <SchemaOrgTypeTag value={data.schemaOrgType || "Thing"} />
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!size-2 !border-2 !border-white !bg-blue-600" isConnectable={false} />
    </div>
  );
}
