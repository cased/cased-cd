// Kubernetes field editability rules
// This module determines which fields can be edited in live cluster resources

import type { Application } from '@/types/api'

// Fields that are always read-only (system-managed)
const READ_ONLY_FIELDS = [
  'metadata.uid',
  'metadata.creationTimestamp',
  'metadata.generation',
  'metadata.resourceVersion',
  'metadata.managedFields',
  'metadata.selfLink',
  'metadata.ownerReferences', // Usually system-managed
  'status', // Entire status section is controller-managed
]

// Fields that are immutable after resource creation
const IMMUTABLE_AFTER_CREATION = ['metadata.name', 'metadata.namespace']

// Resource-specific immutable fields
const IMMUTABLE_BY_KIND: Record<string, string[]> = {
  Deployment: ['spec.selector'],
  ReplicaSet: ['spec.selector'],
  StatefulSet: ['spec.selector', 'spec.serviceName'],
  DaemonSet: ['spec.selector'],
  Job: ['spec.selector', 'spec.template'],
  CronJob: ['spec.jobTemplate.spec.selector'],
  Service: ['spec.clusterIP', 'spec.clusterIPs', 'spec.ipFamilies', 'spec.ipFamilyPolicy'],
  PersistentVolumeClaim: ['spec.storageClassName', 'spec.volumeName'],
  PersistentVolume: ['spec.claimRef'],
}

// Common editable fields by resource kind (for Quick Edit mode)
export interface FieldDefinition {
  path: string
  type: 'number' | 'string' | 'array' | 'object' | 'boolean'
  label: string
  description?: string
  min?: number
  max?: number
  placeholder?: string
}

export const COMMON_EDITABLE_FIELDS: Record<string, Record<string, FieldDefinition>> = {
  Deployment: {
    replicas: {
      path: 'spec.replicas',
      type: 'number',
      label: 'Replicas',
      description: 'Number of pod replicas to run',
      min: 0,
      max: 100,
    },
    image: {
      path: 'spec.template.spec.containers[0].image',
      type: 'string',
      label: 'Container Image',
      description: 'Docker image to use for the main container',
      placeholder: 'nginx:1.21',
    },
    env: {
      path: 'spec.template.spec.containers[0].env',
      type: 'array',
      label: 'Environment Variables',
      description: 'Environment variables for the container',
    },
    resources: {
      path: 'spec.template.spec.containers[0].resources',
      type: 'object',
      label: 'Resource Limits',
      description: 'CPU and memory requests/limits',
    },
  },
  StatefulSet: {
    replicas: {
      path: 'spec.replicas',
      type: 'number',
      label: 'Replicas',
      description: 'Number of pod replicas to run',
      min: 0,
      max: 100,
    },
    image: {
      path: 'spec.template.spec.containers[0].image',
      type: 'string',
      label: 'Container Image',
      placeholder: 'postgres:14',
    },
  },
  DaemonSet: {
    image: {
      path: 'spec.template.spec.containers[0].image',
      type: 'string',
      label: 'Container Image',
    },
  },
  ConfigMap: {
    data: {
      path: 'data',
      type: 'object',
      label: 'Data',
      description: 'Key-value configuration data',
    },
  },
  Secret: {
    data: {
      path: 'data',
      type: 'object',
      label: 'Data',
      description: 'Key-value secret data (base64 encoded)',
    },
  },
  Service: {
    ports: {
      path: 'spec.ports',
      type: 'array',
      label: 'Ports',
      description: 'Service ports configuration',
    },
  },
}

// Check if a specific field path is editable
export function isFieldEditable(
  kind: string,
  fieldPath: string,
  managedFields?: Array<{ manager: string; fieldsV1?: unknown }>
): {
  editable: boolean
  reason?: string
  warning?: string
} {
  // Check if it's globally read-only
  if (READ_ONLY_FIELDS.some((path) => fieldPath.startsWith(path))) {
    return {
      editable: false,
      reason: 'This field is managed by Kubernetes and cannot be edited.',
    }
  }

  // Check if it's immutable after creation
  if (IMMUTABLE_AFTER_CREATION.includes(fieldPath)) {
    return {
      editable: false,
      reason: 'This field is immutable after resource creation.',
    }
  }

  // Check resource-specific immutable fields
  const kindImmutable = IMMUTABLE_BY_KIND[kind] || []
  if (kindImmutable.some((path) => fieldPath.startsWith(path))) {
    return {
      editable: false,
      reason: `This field is immutable for ${kind} resources.`,
    }
  }

  // Check if managed by controllers (warning, not blocking)
  if (managedFields) {
    const managers = managedFields.map((mf) => mf.manager).filter(Boolean)

    // Warn if managed by autoscaler
    if (
      managers.includes('kube-controller-manager') ||
      managers.includes('horizontal-pod-autoscaler') ||
      managers.includes('vpa-recommender')
    ) {
      return {
        editable: true,
        warning: 'This field is managed by an autoscaler. Your changes may be overwritten.',
      }
    }

    // Warn if managed by multiple controllers
    if (managers.length > 1) {
      return {
        editable: true,
        warning: `This field is managed by multiple controllers: ${managers.join(', ')}. Changes may be overwritten.`,
      }
    }
  }

  return { editable: true }
}

// Check if resource editing is allowed based on app state
export function canEditResource(app: Application): {
  allowed: boolean
  reason?: string
  warning?: string
} {
  // Check if auto-sync is enabled
  if (app.spec.syncPolicy?.automated) {
    return {
      allowed: false,
      reason:
        'Auto-sync is enabled. Changes will be immediately reverted. Disable auto-sync first, or edit the Git repository instead.',
    }
  }

  // Editing is allowed but warn about OutOfSync
  return {
    allowed: true,
    warning:
      'This will modify the live cluster resource. The application will show as OutOfSync until you sync from Git.',
  }
}

// Get common editable fields for a resource kind
export function getEditableFields(kind: string): Record<string, FieldDefinition> {
  return COMMON_EDITABLE_FIELDS[kind] || {}
}

// Helper to get nested value from object using path notation
export function getNestedValue(obj: unknown, path: string): unknown {
  // Handle array notation like containers[0].image
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (!current) return undefined

    // Handle array index notation
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, key, index] = arrayMatch
      const obj = current as Record<string, unknown>
      const arr = obj[key] as unknown[]
      current = arr?.[parseInt(index)]
    } else {
      const obj = current as Record<string, unknown>
      current = obj[part]
    }
  }

  return current
}

// Helper to set nested value in object using path notation
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]

    // Handle array notation
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, key, index] = arrayMatch
      const idx = parseInt(index)

      if (!current[key]) current[key] = []
      const arr = current[key] as unknown[]
      if (!arr[idx]) arr[idx] = {}
      current = arr[idx] as Record<string, unknown>
    } else {
      if (!current[part]) current[part] = {}
      current = current[part] as Record<string, unknown>
    }
  }

  // Set the final value
  const lastPart = parts[parts.length - 1]
  const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/)
  if (arrayMatch) {
    const [, key, index] = arrayMatch
    const idx = parseInt(index)
    if (!current[key]) current[key] = []
    const arr = current[key] as unknown[]
    arr[idx] = value
  } else {
    current[lastPart] = value
  }
}
