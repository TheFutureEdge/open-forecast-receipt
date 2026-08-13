import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useNodesState,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  ArrowsClockwise,
  Buildings,
  ChartLineUp,
  CheckCircle,
  Fingerprint,
  Receipt,
  Target,
  TrendUp,
  UserCircle,
} from "@phosphor-icons/react";
import "@xyflow/react/dist/style.css";
import {
  knowledgeGraphViewEdges,
  knowledgeGraphViewNodes,
  type KnowledgeNodeKind,
} from "./knowledgeGraphData";
import { KnowledgeGraphLegend } from "./KnowledgeGraphLegend";
import { KnowledgeGraphTag } from "./KnowledgeGraphTag";
import { SchemaOrgTypeTag } from "./SchemaOrgTypeTag";

type KnowledgeNodeData = Record<string, unknown> & {
  kind: KnowledgeNodeKind;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  schemaOrgType?: string;
  dimension?: string;
  unit?: string;
};

type KnowledgeFlowNode = Node<KnowledgeNodeData, "knowledge">;

const nodeTypeStyles: Record<KnowledgeNodeKind, { accent: string; surface: string; border: string; minimap: string }> = {
  context_entity: { accent: "text-violet-700 dark:text-violet-300", surface: "bg-violet-50 dark:bg-violet-950/35", border: "border-violet-200 dark:border-violet-900", minimap: "#8b5cf6" },
  subject_entity: { accent: "text-emerald-700 dark:text-emerald-300", surface: "bg-emerald-50 dark:bg-emerald-950/35", border: "border-emerald-200 dark:border-emerald-900", minimap: "#10b981" },
  target_definition: { accent: "text-blue-700 dark:text-blue-300", surface: "bg-blue-50 dark:bg-blue-950/35", border: "border-blue-200 dark:border-blue-900", minimap: "#2563eb" },
  target_binding: { accent: "text-cyan-700 dark:text-cyan-300", surface: "bg-cyan-50 dark:bg-cyan-950/35", border: "border-cyan-200 dark:border-cyan-900", minimap: "#0891b2" },
  forecaster: { accent: "text-amber-700 dark:text-amber-300", surface: "bg-amber-50 dark:bg-amber-950/35", border: "border-amber-200 dark:border-amber-900", minimap: "#d97706" },
  forecast: { accent: "text-indigo-700 dark:text-indigo-300", surface: "bg-indigo-50 dark:bg-indigo-950/35", border: "border-indigo-200 dark:border-indigo-900", minimap: "#4f46e5" },
  receipt: { accent: "text-slate-700 dark:text-slate-200", surface: "bg-slate-50 dark:bg-slate-800", border: "border-slate-300 dark:border-slate-700", minimap: "#475569" },
  proof: { accent: "text-fuchsia-700 dark:text-fuchsia-300", surface: "bg-fuchsia-50 dark:bg-fuchsia-950/35", border: "border-fuchsia-200 dark:border-fuchsia-900", minimap: "#c026d3" },
  evaluation: { accent: "text-rose-700 dark:text-rose-300", surface: "bg-rose-50 dark:bg-rose-950/35", border: "border-rose-200 dark:border-rose-900", minimap: "#e11d48" },
};

const nodeIcons: Record<KnowledgeNodeKind, typeof Buildings> = {
  context_entity: Buildings,
  subject_entity: TrendUp,
  target_definition: Target,
  target_binding: CheckCircle,
  forecaster: UserCircle,
  forecast: ChartLineUp,
  receipt: Receipt,
  proof: Fingerprint,
  evaluation: ChartLineUp,
};

const initialNodes: KnowledgeFlowNode[] = knowledgeGraphViewNodes.map(({ id, position, ...data }) => ({
  id,
  type: "knowledge",
  position,
  data,
  draggable: true,
  selectable: true,
  connectable: false,
  deletable: false,
  ariaLabel: `${data.eyebrow}: ${data.title}. ${data.subtitle}`,
}));

const graphEdges = knowledgeGraphViewEdges.map((edge) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  label: edge.label,
  type: "smoothstep",
  animated: Boolean(edge.optional),
  markerEnd: { type: MarkerType.ArrowClosed, color: edge.optional ? "#c026d3" : "#64748b" },
  style: { stroke: edge.optional ? "#c026d3" : "#64748b", strokeWidth: 1.5, strokeDasharray: edge.optional ? "5 4" : undefined },
  labelStyle: { fill: "#475569", fontSize: 10, fontWeight: 700 },
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.92 },
  labelBgPadding: [6, 4] as [number, number],
  labelBgBorderRadius: 6,
}));

const nodeTypes = { knowledge: KnowledgeGraphNode };

export function InteractiveKnowledgeGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<KnowledgeFlowNode>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState("security-baba");
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || nodes[0],
    [nodes, selectedNodeId],
  );

  function resetLayout() {
    setNodes(initialNodes.map((node) => ({ ...node, position: { ...node.position }, selected: false })));
    setSelectedNodeId("security-baba");
  }

  return (
    <section id="interactive-knowledge-graph" data-testid="interactive-knowledge-graph" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">Interactive graph</div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">2D · draggable</span>
          </div>
          <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Explore the nodes and edges</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Drag nodes, pan the canvas, zoom, or select any object to inspect its role.</p>
        </div>
        <button type="button" onClick={resetLayout} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <ArrowsClockwise size={15} /> Reset layout
        </button>
      </div>

      <KnowledgeGraphLegend className="border-b border-slate-200 dark:border-slate-800" />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="h-[38rem] min-w-0 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 xl:border-b-0 xl:border-r">
          <ReactFlow
            nodes={nodes}
            edges={graphEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId("")}
            nodesDraggable
            nodesConnectable={false}
            edgesReconnectable={false}
            elementsSelectable
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.16, duration: 500 }}
            minZoom={0.35}
            maxZoom={1.7}
            aria-label="Interactive Open Forecast Library knowledge graph"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#cbd5e1" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => nodeTypeStyles[(node.data as KnowledgeNodeData).kind].minimap}
              maskColor="rgba(15, 23, 42, 0.08)"
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="p-5 sm:p-6" aria-live="polite">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Selected node</div>
          {selectedNode ? (
            <NodeDetails data={selectedNode.data} />
          ) : (
            <p className="mt-3 text-xs leading-5 text-slate-500">Select a node to inspect what it represents and why it exists.</p>
          )}
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Interaction guide</div>
            <ul className="mt-3 space-y-2 text-[11px] leading-5 text-slate-500">
              <li><strong className="text-slate-700 dark:text-slate-200">Drag</strong> a node to reorganize the graph.</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Scroll or pinch</strong> to zoom.</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Drag empty space</strong> to pan.</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Dashed edge</strong> means an optional relationship.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

function KnowledgeGraphNode({ data, selected }: NodeProps<KnowledgeFlowNode>) {
  const styles = nodeTypeStyles[data.kind];
  const Icon = nodeIcons[data.kind];
  return (
    <div className={`w-52 rounded-xl border bg-white p-3 shadow-sm transition-shadow dark:bg-slate-900 ${styles.border} ${selected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-50 shadow-lg dark:ring-offset-slate-950" : ""}`}>
      <Handle type="target" position={Position.Left} className="!size-2 !border-2 !border-white !bg-slate-400" isConnectable={false} />
      <div className="flex items-start gap-2.5">
        <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${styles.surface} ${styles.accent}`}><Icon size={17} weight="duotone" /></div>
        <div className="min-w-0">
          <div className={`text-[8px] font-black uppercase tracking-[0.12em] ${styles.accent}`}>{data.eyebrow}</div>
          <div className="mt-0.5 text-xs font-bold leading-4 text-slate-950 dark:text-white">{data.title}</div>
          <div className="mt-1 text-[9px] leading-4 text-slate-500 dark:text-slate-400">{data.subtitle}</div>
          {data.schemaOrgType && <SchemaOrgTypeTag value={data.schemaOrgType} className="mt-2" />}
          {(data.dimension || data.unit) && (
            <div className="mt-2 flex max-w-full flex-wrap gap-1">
              {data.dimension && <KnowledgeGraphTag kind="dimension" title={`Dimension: ${data.dimension}`}>Dim.: {data.dimension}</KnowledgeGraphTag>}
              {data.unit && <KnowledgeGraphTag kind="unit">Unit: {data.unit}</KnowledgeGraphTag>}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!size-2 !border-2 !border-white !bg-slate-500" isConnectable={false} />
    </div>
  );
}

function NodeDetails({ data }: { data: KnowledgeNodeData }) {
  const styles = nodeTypeStyles[data.kind];
  const Icon = nodeIcons[data.kind];
  return (
    <div className="mt-3">
      <div className={`grid size-10 place-items-center rounded-xl ${styles.surface} ${styles.accent}`}><Icon size={21} weight="duotone" /></div>
      <div className={`mt-4 text-[9px] font-black uppercase tracking-[0.12em] ${styles.accent}`}>{data.eyebrow}</div>
      <h4 className="mt-1 text-base font-bold text-slate-950 dark:text-white">{data.title}</h4>
      <div className="mt-1 text-[10px] font-semibold text-slate-500">{data.subtitle}</div>
      {data.schemaOrgType && <SchemaOrgTypeTag value={data.schemaOrgType} className="mt-3" />}
      {(data.dimension || data.unit) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.dimension && <KnowledgeGraphTag kind="dimension" title={`Dimension: ${data.dimension}`}>Dim.: {data.dimension}</KnowledgeGraphTag>}
          {data.unit && <KnowledgeGraphTag kind="unit">Unit: {data.unit}</KnowledgeGraphTag>}
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{data.description}</p>
    </div>
  );
}
