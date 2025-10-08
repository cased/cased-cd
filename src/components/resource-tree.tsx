import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import type { Node, Edge, NodeTypes } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CheckCircle2, AlertCircle, Clock, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Resource {
  kind: string
  name: string
  namespace?: string
  status?: string
  health?: {
    status?: string
  }
  group?: string
  version?: string
}

interface ResourceTreeProps {
  resources: Resource[]
  onResourceClick?: (resource: Resource) => void
}

const healthIcons = {
  Healthy: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Progressing: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  Degraded: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  Suspended: { icon: AlertCircle, color: 'text-neutral-400', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20' },
  Missing: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  Unknown: { icon: Activity, color: 'text-neutral-500', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20' },
}

// Custom node component
function ResourceNode({ data }: { data: any }) {
  const resource = data.resource as Resource
  const healthStatus = resource.health?.status || 'Unknown'
  const health = healthIcons[healthStatus] || healthIcons.Unknown
  const HealthIcon = health.icon

  return (
    <div
      className={`px-4 py-3 rounded-lg border ${health.border} ${health.bg} bg-neutral-950 min-w-[200px] cursor-pointer hover:border-neutral-600 transition-colors`}
      onClick={() => data.onClick?.(resource)}
    >
      <div className="flex items-center gap-2 mb-2">
        <HealthIcon className={`h-4 w-4 ${health.color}`} />
        <span className="text-xs font-medium text-neutral-500 uppercase">{resource.kind}</span>
      </div>
      <div className="font-medium text-white text-sm mb-1 truncate">{resource.name}</div>
      {resource.namespace && (
        <div className="text-xs text-neutral-400">ns: {resource.namespace}</div>
      )}
      <div className="mt-2">
        <Badge
          variant={healthStatus === 'Healthy' ? 'success' : healthStatus === 'Degraded' ? 'warning' : 'info'}
          className="text-xs"
        >
          {healthStatus}
        </Badge>
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  resource: ResourceNode,
}

export function ResourceTree({ resources, onResourceClick }: ResourceTreeProps) {
  // Build the tree structure
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Group resources by kind
    const resourcesByKind = resources.reduce((acc, resource) => {
      if (!acc[resource.kind]) {
        acc[resource.kind] = []
      }
      acc[resource.kind].push(resource)
      return acc
    }, {} as Record<string, Resource[]>)

    // Create a hierarchy: Application -> Deployments/StatefulSets -> ReplicaSets -> Pods
    const hierarchy = [
      ['Application'],
      ['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob'],
      ['ReplicaSet'],
      ['Pod'],
      ['Service', 'Ingress', 'ConfigMap', 'Secret', 'PersistentVolumeClaim'],
    ]

    let yOffset = 0
    const xSpacing = 300
    const ySpacing = 150

    hierarchy.forEach((kindGroup, levelIndex) => {
      kindGroup.forEach((kind) => {
        const resourcesOfKind = resourcesByKind[kind] || []
        resourcesOfKind.forEach((resource, index) => {
          const nodeId = `${resource.kind}-${resource.name}-${resource.namespace || 'default'}`

          nodes.push({
            id: nodeId,
            type: 'resource',
            position: {
              x: levelIndex * xSpacing,
              y: yOffset + (index * ySpacing)
            },
            data: {
              resource,
              onClick: onResourceClick,
            },
          })
        })

        if (resourcesOfKind.length > 0) {
          yOffset += resourcesOfKind.length * ySpacing
        }
      })
    })

    // If we have resources not in the hierarchy, add them at the end
    const allHierarchyKinds = hierarchy.flat()
    const otherKinds = Object.keys(resourcesByKind).filter(k => !allHierarchyKinds.includes(k))

    otherKinds.forEach((kind) => {
      const resourcesOfKind = resourcesByKind[kind] || []
      resourcesOfKind.forEach((resource, index) => {
        const nodeId = `${resource.kind}-${resource.name}-${resource.namespace || 'default'}`

        nodes.push({
          id: nodeId,
          type: 'resource',
          position: {
            x: hierarchy.length * xSpacing,
            y: yOffset + (index * ySpacing)
          },
          data: {
            resource,
            onClick: onResourceClick,
          },
        })
      })

      if (resourcesOfKind.length > 0) {
        yOffset += resourcesOfKind.length * ySpacing
      }
    })

    // Create edges based on common relationships
    // Deployment -> ReplicaSet -> Pod
    resources.forEach(resource => {
      const nodeId = `${resource.kind}-${resource.name}-${resource.namespace || 'default'}`

      // Simple relationship detection based on naming conventions
      if (resource.kind === 'Pod') {
        // Find ReplicaSet that owns this pod (usually pod name starts with RS name)
        const ownerRS = resources.find(r =>
          r.kind === 'ReplicaSet' &&
          resource.name.startsWith(r.name) &&
          r.namespace === resource.namespace
        )
        if (ownerRS) {
          edges.push({
            id: `${ownerRS.kind}-${ownerRS.name}-${resource.name}`,
            source: `${ownerRS.kind}-${ownerRS.name}-${ownerRS.namespace || 'default'}`,
            target: nodeId,
            type: 'smoothstep',
            animated: resource.health?.status === 'Progressing',
            style: { stroke: '#525252' },
          })
        }
      }

      if (resource.kind === 'ReplicaSet') {
        // Find Deployment that owns this RS
        const ownerDeploy = resources.find(r =>
          r.kind === 'Deployment' &&
          resource.name.startsWith(r.name) &&
          r.namespace === resource.namespace
        )
        if (ownerDeploy) {
          edges.push({
            id: `${ownerDeploy.kind}-${ownerDeploy.name}-${resource.name}`,
            source: `${ownerDeploy.kind}-${ownerDeploy.name}-${ownerDeploy.namespace || 'default'}`,
            target: nodeId,
            type: 'smoothstep',
            animated: resource.health?.status === 'Progressing',
            style: { stroke: '#525252' },
          })
        }
      }
    })

    return { nodes, edges }
  }, [resources, onResourceClick])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="h-[600px] rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        className="bg-neutral-950"
      >
        <Background color="#404040" gap={16} />
        <Controls className="bg-neutral-900 border border-neutral-800 rounded-lg" />
        <MiniMap
          className="bg-neutral-900 border border-neutral-800 rounded-lg"
          nodeColor={(node) => {
            const resource = node.data.resource as Resource
            const healthStatus = resource.health?.status || 'Unknown'
            const colors = {
              Healthy: '#10b981',
              Progressing: '#3b82f6',
              Degraded: '#f59e0b',
              Suspended: '#737373',
              Missing: '#ef4444',
              Unknown: '#737373',
            }
            return colors[healthStatus] || colors.Unknown
          }}
        />
      </ReactFlow>
    </div>
  )
}
