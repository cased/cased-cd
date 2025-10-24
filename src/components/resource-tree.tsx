import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "@xyflow/react";
import type { Node, Edge, NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  IconCircleCheck,
  IconCircleWarning,
  IconClock3,
  IconCircleInfo,
  IconChevronRight,
  IconChevronDown,
} from "obra-icons-react";
import { Badge } from "@/components/ui/badge";

interface Resource {
  kind: string;
  name: string;
  namespace?: string;
  status?: string;
  health?: {
    status?: string;
  };
  group?: string;
  version?: string;
  parentRefs?: Array<{
    kind: string;
    name: string;
    namespace?: string;
    group?: string;
  }>;
}

interface ResourceTreeProps {
  resources: Resource[];
  onResourceClick?: (resource: Resource) => void;
}

const healthIcons = {
  Healthy: {
    icon: IconCircleCheck,
    color: "text-grass-11",
    bg: "bg-grass-9/10",
    border: "border-grass-9/20",
  },
  Progressing: {
    icon: IconClock3,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  Degraded: {
    icon: IconCircleWarning,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  Suspended: {
    icon: IconCircleWarning,
    color: "text-neutral-400",
    bg: "bg-neutral-500/10",
    border: "border-neutral-500/20",
  },
  Missing: {
    icon: IconCircleWarning,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  Unknown: {
    icon: IconCircleInfo,
    color: "text-neutral-500",
    bg: "bg-neutral-500/10",
    border: "border-neutral-500/20",
  },
};

interface ResourceNodeData {
  resource: Resource;
  onClick?: (resource: Resource) => void;
}

interface GroupNodeData {
  kind: string;
  count: number;
  isExpanded: boolean;
  onToggle: (kind: string) => void;
  healthSummary: Record<string, number>;
}

// Custom node component
function ResourceNode({ data }: { data: ResourceNodeData }) {
  const resource = data.resource;
  const healthStatus = (resource.health?.status ||
    "Unknown") as keyof typeof healthIcons;
  const health = healthIcons[healthStatus] || healthIcons.Unknown;
  const HealthIcon = health.icon;

  return (
    <div className="relative">
      {/* Input handle (left side) - for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-neutral-400 dark:!bg-neutral-600"
      />

      <div
        className={`px-4 py-3 rounded-lg border ${health.border} ${health.bg} bg-white dark:bg-neutral-950 min-w-[200px] cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors`}
        onClick={() => data.onClick?.(resource)}
      >
        <div className="flex items-center gap-2 mb-2">
          <HealthIcon className={`h-4 w-4 ${health.color}`} />
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500 uppercase">
            {resource.kind}
          </span>
        </div>
        <div className="font-medium text-black dark:text-white text-sm mb-1 truncate">
          {resource.name}
        </div>
        {resource.namespace && (
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            ns: {resource.namespace}
          </div>
        )}
        <div className="mt-2">
          <Badge
            variant={
              healthStatus === "Healthy"
                ? "default"
                : healthStatus === "Degraded"
                  ? "destructive"
                  : "secondary"
            }
            className="text-xs"
          >
            {healthStatus}
          </Badge>
        </div>
      </div>

      {/* Output handle (right side) - for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-neutral-400 dark:!bg-neutral-600"
      />
    </div>
  );
}

// Group node component
function GroupNode({ data }: { data: GroupNodeData }) {
  const Icon = data.isExpanded ? IconChevronDown : IconChevronRight;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-neutral-400 dark:!bg-neutral-600"
      />

      <div
        className="px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 min-w-[240px] cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
        onClick={() => data.onToggle(data.kind)}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          <span className="text-sm font-semibold text-black dark:text-white">
            {data.kind}
          </span>
          <Badge variant="secondary" className="text-xs ml-auto">
            {data.count}
          </Badge>
        </div>

        {/* Health summary */}
        <div className="flex gap-2 flex-wrap mt-2">
          {Object.entries(data.healthSummary).map(([status, count]) => {
            const health =
              healthIcons[status as keyof typeof healthIcons] ||
              healthIcons.Unknown;
            const HealthIcon = health.icon;
            if (count === 0) return null;
            return (
              <div key={status} className="flex items-center gap-1 text-xs">
                <HealthIcon className={`h-3 w-3 ${health.color}`} />
                <span className="text-neutral-600 dark:text-neutral-400">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-neutral-400 dark:!bg-neutral-600"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  resource: ResourceNode,
  group: GroupNode,
};

export function ResourceTree({
  resources,
  onResourceClick,
}: ResourceTreeProps) {
  // State to track which groups are expanded (default: all collapsed except important ones)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    return new Set(["Deployment", "StatefulSet", "Service"]);
  });

  const toggleGroup = useCallback((kind: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  }, []);

  // Build the tree structure
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Group resources by kind
    const resourcesByKind = resources.reduce(
      (acc, resource) => {
        if (!acc[resource.kind]) {
          acc[resource.kind] = [];
        }
        acc[resource.kind].push(resource);
        return acc;
      },
      {} as Record<string, Resource[]>,
    );

    // Create a hierarchy: Top-level resources -> ReplicaSets -> Pods
    const hierarchy = [
      [
        "Deployment",
        "StatefulSet",
        "DaemonSet",
        "Job",
        "CronJob",
        "Service",
        "Ingress",
        "ConfigMap",
        "Secret",
      ],
      ["ReplicaSet"],
      ["Pod"],
    ];

    let yOffset = 0;
    const xSpacing = 400;
    const ySpacing = 150;
    const groupSpacing = 100;

    hierarchy.forEach((kindGroup, levelIndex) => {
      kindGroup.forEach((kind) => {
        const resourcesOfKind = resourcesByKind[kind] || [];
        if (resourcesOfKind.length === 0) return;

        const isExpanded = expandedGroups.has(kind);

        // Calculate health summary
        const healthSummary: Record<string, number> = {};
        resourcesOfKind.forEach((r) => {
          const status = r.health?.status || "Unknown";
          healthSummary[status] = (healthSummary[status] || 0) + 1;
        });

        // Add group node
        const groupNodeId = `group-${kind}`;
        nodes.push({
          id: groupNodeId,
          type: "group",
          position: {
            x: levelIndex * xSpacing,
            y: yOffset,
          },
          data: {
            kind,
            count: resourcesOfKind.length,
            isExpanded,
            onToggle: toggleGroup,
            healthSummary,
          },
        });

        yOffset += groupSpacing;

        // If expanded, show individual resources
        if (isExpanded) {
          resourcesOfKind.forEach((resource, index) => {
            const nodeId = `${resource.kind}-${resource.name}-${resource.namespace || "default"}`;

            nodes.push({
              id: nodeId,
              type: "resource",
              position: {
                x: levelIndex * xSpacing + 50,
                y: yOffset + index * ySpacing,
              },
              data: {
                resource,
                onClick: onResourceClick,
              },
            });
          });

          yOffset += resourcesOfKind.length * ySpacing;
        }

        yOffset += 10; // Extra spacing between groups
      });
    });

    // If we have resources not in the hierarchy, add them at the end
    const allHierarchyKinds = hierarchy.flat();
    const otherKinds = Object.keys(resourcesByKind).filter(
      (k) => !allHierarchyKinds.includes(k),
    );

    otherKinds.forEach((kind) => {
      const resourcesOfKind = resourcesByKind[kind] || [];
      if (resourcesOfKind.length === 0) return;

      const isExpanded = expandedGroups.has(kind);

      const healthSummary: Record<string, number> = {};
      resourcesOfKind.forEach((r) => {
        const status = r.health?.status || "Unknown";
        healthSummary[status] = (healthSummary[status] || 0) + 1;
      });

      const groupNodeId = `group-${kind}`;
      nodes.push({
        id: groupNodeId,
        type: "group",
        position: {
          x: hierarchy.length * xSpacing,
          y: yOffset,
        },
        data: {
          kind,
          count: resourcesOfKind.length,
          isExpanded,
          onToggle: toggleGroup,
          healthSummary,
        },
      });

      yOffset += groupSpacing;

      if (isExpanded) {
        resourcesOfKind.forEach((resource, index) => {
          const nodeId = `${resource.kind}-${resource.name}-${resource.namespace || "default"}`;

          nodes.push({
            id: nodeId,
            type: "resource",
            position: {
              x: hierarchy.length * xSpacing + 50,
              y: yOffset + index * ySpacing,
            },
            data: {
              resource,
              onClick: onResourceClick,
            },
          });
        });

        yOffset += resourcesOfKind.length * ySpacing;
      }

      yOffset += 10;
    });

    // Create edges based on parentRefs from ArgoCD API
    // Only show edges if both source and target nodes are visible
    resources.forEach((resource) => {
      const targetNodeId = `${resource.kind}-${resource.name}-${resource.namespace || "default"}`;
      const targetGroupId = `group-${resource.kind}`;

      // Use parentRefs to create edges
      resource.parentRefs?.forEach((parent) => {
        const sourceNodeId = `${parent.kind}-${parent.name}-${parent.namespace || "default"}`;
        const sourceGroupId = `group-${parent.kind}`;

        // If both are expanded, connect individual nodes
        if (
          expandedGroups.has(resource.kind) &&
          expandedGroups.has(parent.kind)
        ) {
          edges.push({
            id: `${sourceNodeId}-to-${targetNodeId}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: "smoothstep",
            animated: resource.health?.status === "Progressing",
            style: { stroke: "#737373", strokeWidth: 2 },
            markerEnd: {
              type: "arrowclosed",
              color: "#737373",
            },
          });
        }
        // If source is collapsed but target is expanded, connect group to node
        else if (
          !expandedGroups.has(parent.kind) &&
          expandedGroups.has(resource.kind)
        ) {
          const edgeId = `${sourceGroupId}-to-${targetNodeId}`;
          if (!edges.find((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: sourceGroupId,
              target: targetNodeId,
              type: "smoothstep",
              style: {
                stroke: "#8c8c8c",
                strokeWidth: 1.5,
                strokeDasharray: "5,5",
              },
            });
          }
        }
        // If target is collapsed but source is expanded, connect node to group
        else if (
          expandedGroups.has(parent.kind) &&
          !expandedGroups.has(resource.kind)
        ) {
          const edgeId = `${sourceNodeId}-to-${targetGroupId}`;
          if (!edges.find((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: sourceNodeId,
              target: targetGroupId,
              type: "smoothstep",
              style: {
                stroke: "#8c8c8c",
                strokeWidth: 1.5,
                strokeDasharray: "5,5",
              },
            });
          }
        }
        // If both collapsed, connect groups
        else {
          const edgeId = `${sourceGroupId}-to-${targetGroupId}`;
          if (!edges.find((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: sourceGroupId,
              target: targetGroupId,
              type: "smoothstep",
              style: {
                stroke: "#737373",
                strokeWidth: 2,
                strokeDasharray: "5,5",
              },
            });
          }
        }
      });
    });

    return { nodes, edges };
  }, [resources, onResourceClick, expandedGroups, toggleGroup]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when they change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="h-[650px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.05}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        fitViewOptions={{ padding: 0.2, maxZoom: 0.8 }}
        className="bg-white dark:bg-neutral-950 [&_.react-flow__node]:!bg-transparent [&_.react-flow__node]:!border-none [&_.react-flow__node]:!shadow-none [&_.react-flow__node.selected]:!bg-transparent [&_.react-flow__node.selected]:!shadow-none"
      >
        <Background
          gap={16}
          className="[&_path]:stroke-neutral-300 dark:[&_path]:stroke-neutral-700"
        />
        <Controls className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg [&_button]:text-black dark:[&_button]:text-white" />
      </ReactFlow>
    </div>
  );
}
