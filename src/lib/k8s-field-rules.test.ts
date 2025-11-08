import { describe, it, expect } from 'vitest'
import {
  isFieldEditable,
  canEditResource,
  getEditableFields,
  getNestedValue,
  setNestedValue,
  COMMON_EDITABLE_FIELDS,
} from './k8s-field-rules'
import type { Application } from '@/types/api'

describe('k8s-field-rules', () => {
  describe('isFieldEditable()', () => {
    it('should block editing of status fields', () => {
      const result = isFieldEditable('Deployment', 'status.replicas')
      expect(result.editable).toBe(false)
      expect(result.reason).toContain('managed by Kubernetes')
    })

    it('should block editing of metadata.uid', () => {
      const result = isFieldEditable('Deployment', 'metadata.uid')
      expect(result.editable).toBe(false)
      expect(result.reason).toContain('managed by Kubernetes')
    })

    it('should block editing of immutable-after-creation fields', () => {
      const result = isFieldEditable('Deployment', 'metadata.name')
      expect(result.editable).toBe(false)
      expect(result.reason).toContain('immutable after resource creation')
    })

    it('should block editing of Deployment selector', () => {
      const result = isFieldEditable('Deployment', 'spec.selector')
      expect(result.editable).toBe(false)
      expect(result.reason).toContain('immutable for Deployment')
    })

    it('should block editing of Service clusterIP', () => {
      const result = isFieldEditable('Service', 'spec.clusterIP')
      expect(result.editable).toBe(false)
      expect(result.reason).toContain('immutable for Service')
    })

    it('should allow editing of spec.replicas', () => {
      const result = isFieldEditable('Deployment', 'spec.replicas')
      expect(result.editable).toBe(true)
    })

    it('should allow editing of container image', () => {
      const result = isFieldEditable('Deployment', 'spec.template.spec.containers[0].image')
      expect(result.editable).toBe(true)
    })

    it('should warn if field is managed by HPA', () => {
      const managedFields = [
        { manager: 'horizontal-pod-autoscaler', fieldsV1: {} },
      ]
      const result = isFieldEditable('Deployment', 'spec.replicas', managedFields)
      expect(result.editable).toBe(true)
      expect(result.warning).toContain('managed by an autoscaler')
    })

    it('should warn if field is managed by controller', () => {
      const managedFields = [
        { manager: 'kube-controller-manager', fieldsV1: {} },
      ]
      const result = isFieldEditable('Deployment', 'spec.template', managedFields)
      expect(result.editable).toBe(true)
      expect(result.warning).toContain('managed by an autoscaler')
    })
  })

  describe('canEditResource()', () => {
    it('should block editing if auto-sync is enabled', () => {
      const app: Application = {
        metadata: { name: 'test-app' },
        spec: {
          source: { repoURL: 'https://example.com/repo', path: '.' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
          syncPolicy: {
            automated: {
              prune: true,
              selfHeal: true,
            },
          },
        },
        status: {},
      } as Application

      const result = canEditResource(app)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Auto-sync is enabled')
    })

    it('should allow editing but warn if auto-sync is disabled', () => {
      const app: Application = {
        metadata: { name: 'test-app' },
        spec: {
          source: { repoURL: 'https://example.com/repo', path: '.' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
        status: {},
      } as Application

      const result = canEditResource(app)
      expect(result.allowed).toBe(true)
      expect(result.warning).toContain('OutOfSync')
    })
  })

  describe('getEditableFields()', () => {
    it('should return fields for Deployment', () => {
      const fields = getEditableFields('Deployment')
      expect(fields).toHaveProperty('replicas')
      expect(fields).toHaveProperty('image')
      expect(fields).toHaveProperty('env')
      expect(fields).toHaveProperty('resources')
      expect(fields.replicas.type).toBe('number')
      expect(fields.image.type).toBe('string')
    })

    it('should return fields for StatefulSet', () => {
      const fields = getEditableFields('StatefulSet')
      expect(fields).toHaveProperty('replicas')
      expect(fields).toHaveProperty('image')
      expect(fields.replicas.min).toBe(0)
      expect(fields.replicas.max).toBe(100)
    })

    it('should return fields for ConfigMap', () => {
      const fields = getEditableFields('ConfigMap')
      expect(fields).toHaveProperty('data')
      expect(fields.data.type).toBe('object')
    })

    it('should return empty object for unknown resource types', () => {
      const fields = getEditableFields('UnknownKind')
      expect(fields).toEqual({})
    })

    it('should have all expected resource types', () => {
      const kinds = ['Deployment', 'StatefulSet', 'DaemonSet', 'ConfigMap', 'Secret', 'Service']
      for (const kind of kinds) {
        const fields = getEditableFields(kind)
        expect(Object.keys(fields).length).toBeGreaterThan(0)
      }
    })
  })

  describe('getNestedValue()', () => {
    it('should get simple nested value', () => {
      const obj = { spec: { replicas: 3 } }
      const result = getNestedValue(obj, 'spec.replicas')
      expect(result).toBe(3)
    })

    it('should get deeply nested value', () => {
      const obj = { spec: { template: { spec: { containers: [] } } } }
      const result = getNestedValue(obj, 'spec.template.spec.containers')
      expect(result).toEqual([])
    })

    it('should handle array notation', () => {
      const obj = {
        spec: {
          template: {
            spec: {
              containers: [{ name: 'app', image: 'nginx:1.21' }],
            },
          },
        },
      }
      const result = getNestedValue(obj, 'spec.template.spec.containers[0].image')
      expect(result).toBe('nginx:1.21')
    })

    it('should return undefined for non-existent path', () => {
      const obj = { spec: { replicas: 3 } }
      const result = getNestedValue(obj, 'spec.nonexistent.field')
      expect(result).toBeUndefined()
    })

    it('should return undefined for non-existent array index', () => {
      const obj = { items: ['a', 'b'] }
      const result = getNestedValue(obj, 'items[5]')
      expect(result).toBeUndefined()
    })

    it('should handle null in path', () => {
      const obj = { spec: null }
      const result = getNestedValue(obj, 'spec.replicas')
      expect(result).toBeUndefined()
    })
  })

  describe('setNestedValue()', () => {
    it('should set simple nested value', () => {
      const obj: Record<string, unknown> = { spec: {} }
      setNestedValue(obj, 'spec.replicas', 5)
      expect(obj.spec).toEqual({ replicas: 5 })
    })

    it('should create intermediate objects', () => {
      const obj: Record<string, unknown> = {}
      setNestedValue(obj, 'spec.template.spec.replicas', 3)
      expect(obj).toEqual({
        spec: {
          template: {
            spec: {
              replicas: 3,
            },
          },
        },
      })
    })

    it('should handle array notation', () => {
      const obj: Record<string, unknown> = {}
      setNestedValue(obj, 'spec.containers[0].image', 'nginx:latest')
      expect(obj).toEqual({
        spec: {
          containers: [
            {
              image: 'nginx:latest',
            },
          ],
        },
      })
    })

    it('should update existing value', () => {
      const obj: Record<string, unknown> = { spec: { replicas: 3 } }
      setNestedValue(obj, 'spec.replicas', 5)
      expect(obj.spec).toEqual({ replicas: 5 })
    })

    it('should handle multiple array indices', () => {
      const obj: Record<string, unknown> = {}
      setNestedValue(obj, 'items[0].value', 'first')
      setNestedValue(obj, 'items[1].value', 'second')
      expect(obj).toEqual({
        items: [{ value: 'first' }, { value: 'second' }],
      })
    })
  })

  describe('COMMON_EDITABLE_FIELDS', () => {
    it('should have correct structure for Deployment', () => {
      const fields = COMMON_EDITABLE_FIELDS.Deployment
      expect(fields.replicas.path).toBe('spec.replicas')
      expect(fields.replicas.type).toBe('number')
      expect(fields.replicas.min).toBe(0)
      expect(fields.replicas.max).toBe(100)
      expect(fields.image.path).toBe('spec.template.spec.containers[0].image')
      expect(fields.env.type).toBe('array')
      expect(fields.resources.type).toBe('object')
    })

    it('should have user-friendly labels', () => {
      const fields = COMMON_EDITABLE_FIELDS.Deployment
      expect(fields.replicas.label).toBe('Replicas')
      expect(fields.image.label).toBe('Container Image')
      expect(fields.env.label).toBe('Environment Variables')
    })

    it('should have helpful descriptions', () => {
      const fields = COMMON_EDITABLE_FIELDS.Deployment
      expect(fields.replicas.description).toContain('Number of pod replicas')
      expect(fields.image.description).toContain('Docker image')
      expect(fields.env.description).toContain('Environment variables')
    })
  })
})
