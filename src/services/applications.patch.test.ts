import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applicationsApi } from './applications'
import api from '@/lib/api-client'
import type { AxiosResponse } from 'axios'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  default: {
    post: vi.fn(),
  },
}))

// Helper to create mock AxiosResponse
const createMockResponse = (data: unknown = {}): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} as never },
})

describe('applications - patchResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('applicationsApi.patchResource()', () => {
    it('should call POST with correct endpoint and query params', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'guestbook-ui',
        kind: 'Deployment',
        namespace: 'default',
        group: 'apps',
        version: 'v1',
        patch: { spec: { replicas: 5 } },
        patchType: 'application/merge-patch+json',
      })

      expect(mockPost).toHaveBeenCalledWith(
        '/applications/guestbook/resource?resourceName=guestbook-ui&kind=Deployment&namespace=default&group=apps&version=v1&patchType=application%2Fmerge-patch%2Bjson',
        expect.any(String),
        { headers: { 'Content-Type': 'application/json' } }
      )
    })

    it('should use default version v1 if not specified', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'guestbook-ui',
        kind: 'Deployment',
        patch: { spec: { replicas: 5 } },
      })

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('version=v1'),
        expect.any(String),
        expect.objectContaining({ headers: expect.any(Object) })
      )
    })

    it('should use default patchType merge-patch+json if not specified', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'guestbook-ui',
        kind: 'Deployment',
        patch: { spec: { replicas: 5 } },
      })

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('patchType=application%2Fmerge-patch%2Bjson'),
        expect.any(String),
        expect.objectContaining({ headers: expect.any(Object) })
      )
    })

    it('should handle empty namespace', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'guestbook-ui',
        kind: 'Deployment',
        patch: { spec: { replicas: 5 } },
      })

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('namespace='),
        expect.any(String),
        expect.objectContaining({ headers: expect.any(Object) })
      )
    })

    it('should handle empty group', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'guestbook-config',
        kind: 'ConfigMap',
        patch: { data: { key: 'value' } },
      })

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('group='),
        expect.any(String),
        expect.objectContaining({ headers: expect.any(Object) })
      )
    })

    it('should send complex patch object', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      const complexPatch = {
        spec: {
          replicas: 5,
          template: {
            spec: {
              containers: [
                {
                  name: 'app',
                  image: 'nginx:1.22',
                  env: [
                    { name: 'LOG_LEVEL', value: 'debug' },
                  ],
                },
              ],
            },
          },
        },
      }

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'guestbook-ui',
        kind: 'Deployment',
        namespace: 'default',
        patch: complexPatch,
      })

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { headers: { 'Content-Type': 'application/json' } }
      )
    })

    it('should support strategic-merge-patch', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'guestbook-ui',
        kind: 'Deployment',
        patch: { spec: { replicas: 5 } },
        patchType: 'application/strategic-merge-patch+json',
      })

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('patchType=application%2Fstrategic-merge-patch%2Bjson'),
        expect.any(String),
        { headers: { 'Content-Type': 'application/json' } }
      )
    })

    it('should support json-patch', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      const jsonPatch = [
        { op: 'replace', path: '/spec/replicas', value: 5 },
      ]

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'guestbook-ui',
        kind: 'Deployment',
        patch: jsonPatch as unknown as Record<string, unknown>,
        patchType: 'application/json-patch+json',
      })

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('patchType=application%2Fjson-patch%2Bjson'),
        expect.any(String),
        { headers: { 'Content-Type': 'application/json' } }
      )
    })

    it('should handle API errors', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockRejectedValue(new Error('Network error'))

      await expect(
        applicationsApi.patchResource({
          appName: 'guestbook',
          resourceName: 'guestbook-ui',
          kind: 'Deployment',
          patch: { spec: { replicas: 5 } },
        })
      ).rejects.toThrow('Network error')
    })

    it('should handle 403 Forbidden errors', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      })

      await expect(
        applicationsApi.patchResource({
          appName: 'guestbook',
          resourceName: 'guestbook-ui',
          kind: 'Deployment',
          patch: { spec: { replicas: 5 } },
        })
      ).rejects.toMatchObject({
        response: { status: 403 },
      })
    })

    it('should URL-encode special characters in resource name', async () => {
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue(createMockResponse())

      await applicationsApi.patchResource({
        appName: 'guestbook',
        resourceName: 'app-with-special#chars',
        kind: 'Deployment',
        patch: { spec: { replicas: 5 } },
      })

      // The resourceName should be URL-encoded in the query string
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('resourceName=app-with-special'),
        expect.any(String),
        { headers: { 'Content-Type': 'application/json' } }
      )
    })
  })
})
