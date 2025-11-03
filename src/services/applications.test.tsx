// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useSyncApplication,
  useApplications,
  useApplication,
  useCreateApplication,
  useUpdateApplication,
  useDeleteApplication,
  useRefreshApplication,
  useResourceTree,
  useManagedResources,
  applicationsApi,
  applicationKeys,
} from './applications'
import api from '@/lib/api-client'
import type { AxiosResponse } from 'axios'
import React from 'react'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('useSyncApplication', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  it('should sync an application successfully', async () => {
    // Mock successful API response
    const mockResponse: AxiosResponse<unknown> = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as never },
    }
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useSyncApplication(), { wrapper })

    // Trigger the mutation
    result.current.mutate({ name: 'test-app', prune: true })

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Verify API was called with correct parameters
    expect(api.post).toHaveBeenCalledWith(
      '/applications/test-app/sync',
      {
        prune: true,
        dryRun: undefined,
        strategy: { hook: {} },
      }
    )
  })

  it('should handle sync errors', async () => {
    // Mock API error
    const error = new Error('Sync failed')
    vi.mocked(api.post).mockRejectedValueOnce(error)

    const { result } = renderHook(() => useSyncApplication(), { wrapper })

    // Trigger the mutation
    result.current.mutate({ name: 'test-app', prune: true })

    // Wait for the mutation to fail
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(error)
  })

  it('should sync with dry run option', async () => {
    const mockResponse: AxiosResponse<unknown> = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as never },
    }
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useSyncApplication(), { wrapper })

    result.current.mutate({ name: 'test-app', prune: false, dryRun: true })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(api.post).toHaveBeenCalledWith(
      '/applications/test-app/sync',
      {
        prune: false,
        dryRun: true,
        strategy: { hook: {} },
      }
    )
  })

  it('should invalidate queries after successful sync', async () => {
    const mockResponse: AxiosResponse<unknown> = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as never },
    }
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSyncApplication(), { wrapper })

    result.current.mutate({ name: 'test-app', prune: true })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Check that queries were invalidated
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('applicationsApi.syncApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call the sync endpoint with correct payload', async () => {
    const mockResponse: AxiosResponse<unknown> = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as never },
    }
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

    await applicationsApi.syncApplication('my-app', true, false)

    expect(api.post).toHaveBeenCalledWith('/applications/my-app/sync', {
      prune: true,
      dryRun: false,
      strategy: { hook: {} },
    })
  })

  it('should handle undefined options', async () => {
    const mockResponse: AxiosResponse<unknown> = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as never },
    }
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

    await applicationsApi.syncApplication('my-app')

    expect(api.post).toHaveBeenCalledWith('/applications/my-app/sync', {
      prune: undefined,
      dryRun: undefined,
      strategy: { hook: {} },
    })
  })
})

describe('applicationsApi.updateApplicationSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call the spec endpoint with PUT and correct payload', async () => {
    const mockSpec = {
      project: 'production',
      source: {
        repoURL: 'https://github.com/example/repo',
        targetRevision: 'main',
        path: 'manifests',
      },
      destination: {
        server: 'https://kubernetes.default.svc',
        namespace: 'prod',
      },
      syncPolicy: {
        automated: {
          prune: true,
          selfHeal: true,
          allowEmpty: false,
        },
        syncOptions: ['CreateNamespace=true'],
      },
    }

    const mockResponse: AxiosResponse<typeof mockSpec> = {
      data: mockSpec,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as never },
    }

    vi.mocked(api.put).mockResolvedValueOnce(mockResponse)

    const result = await applicationsApi.updateApplicationSpec('my-app', mockSpec)

    expect(api.put).toHaveBeenCalledWith('/applications/my-app/spec', mockSpec)
    expect(result).toEqual(mockSpec)
  })

  it('should handle update errors', async () => {
    const mockSpec = {
      project: 'default',
      source: { repoURL: 'https://github.com/test/repo', targetRevision: 'main', path: '.' },
      destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    }

    const error = new Error('Update failed: invalid spec')
    vi.mocked(api.put).mockRejectedValueOnce(error)

    await expect(
      applicationsApi.updateApplicationSpec('my-app', mockSpec)
    ).rejects.toThrow('Update failed: invalid spec')

    expect(api.put).toHaveBeenCalledWith('/applications/my-app/spec', mockSpec)
  })
})

describe('Application Query Keys', () => {
  it('should generate correct query keys', () => {
    expect(applicationKeys.all).toEqual(['applications'])
    expect(applicationKeys.lists()).toEqual(['applications', 'list'])
    expect(applicationKeys.details()).toEqual(['applications', 'detail'])
    expect(applicationKeys.detail('my-app')).toEqual(['applications', 'detail', 'my-app'])
    expect(applicationKeys.resourceTree('my-app')).toEqual(['applications', 'resourceTree', 'my-app'])
    expect(applicationKeys.managedResources('my-app')).toEqual(['applications', 'managedResources', 'my-app'])
  })
})

describe('applicationsApi - Core CRUD', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  describe('getApplications()', () => {
    it('should fetch all applications without filters', async () => {
      const mockApps = {
        metadata: {},
        items: [
          { metadata: { name: 'app1' }, spec: {}, status: {} },
          { metadata: { name: 'app2' }, spec: {}, status: {} },
        ],
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockApps } as any)

      const result = await applicationsApi.getApplications()

      expect(api.get).toHaveBeenCalledWith('/applications?')
      expect(result).toEqual(mockApps)
    })

    it('should fetch applications with filters', async () => {
      const mockApps = { metadata: {}, items: [] }
      vi.mocked(api.get).mockResolvedValue({ data: mockApps } as any)

      await applicationsApi.getApplications({
        project: 'production',
        cluster: 'prod-cluster',
        namespace: 'default',
      })

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('project=production')
      )
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('cluster=prod-cluster')
      )
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('namespace=default')
      )
    })
  })

  describe('getApplication()', () => {
    it('should fetch single application', async () => {
      const mockApp = {
        metadata: { name: 'my-app' },
        spec: { project: 'default' },
        status: { health: { status: 'Healthy' } },
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockApp } as any)

      const result = await applicationsApi.getApplication('my-app')

      expect(api.get).toHaveBeenCalledWith('/applications/my-app')
      expect(result).toEqual(mockApp)
    })
  })

  describe('createApplication()', () => {
    it('should create new application', async () => {
      const newApp = {
        metadata: { name: 'new-app' },
        spec: {
          project: 'default',
          source: { repoURL: 'https://github.com/test/repo', targetRevision: 'main', path: '.' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
        },
      }
      vi.mocked(api.post).mockResolvedValue({ data: newApp } as any)

      const result = await applicationsApi.createApplication(newApp as any)

      expect(api.post).toHaveBeenCalledWith('/applications', newApp)
      expect(result).toEqual(newApp)
    })
  })

  describe('updateApplication()', () => {
    it('should update application', async () => {
      const updatedApp = {
        metadata: { name: 'my-app', labels: { env: 'prod' } },
      }
      vi.mocked(api.put).mockResolvedValue({ data: updatedApp } as any)

      const result = await applicationsApi.updateApplication('my-app', updatedApp)

      expect(api.put).toHaveBeenCalledWith('/applications/my-app', updatedApp)
      expect(result).toEqual(updatedApp)
    })
  })

  describe('deleteApplication()', () => {
    it('should delete application without cascade', async () => {
      vi.mocked(api.delete).mockResolvedValue({} as any)

      await applicationsApi.deleteApplication('my-app')

      expect(api.delete).toHaveBeenCalledWith('/applications/my-app')
    })

    it('should delete application with cascade', async () => {
      vi.mocked(api.delete).mockResolvedValue({} as any)

      await applicationsApi.deleteApplication('my-app', true)

      expect(api.delete).toHaveBeenCalledWith('/applications/my-app?cascade=true')
    })
  })

  describe('refreshApplication()', () => {
    it('should refresh application', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: {} } as any)

      await applicationsApi.refreshApplication('my-app')

      expect(api.get).toHaveBeenCalledWith('/applications/my-app?refresh=normal')
    })
  })

  describe('getResourceTree()', () => {
    it('should fetch resource tree', async () => {
      const mockTree = {
        nodes: [
          { kind: 'Deployment', name: 'my-deployment', namespace: 'default' },
          { kind: 'Service', name: 'my-service', namespace: 'default' },
        ],
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockTree } as any)

      const result = await applicationsApi.getResourceTree('my-app')

      expect(api.get).toHaveBeenCalledWith('/applications/my-app/resource-tree')
      expect(result).toEqual(mockTree)
    })
  })

  describe('getManagedResources()', () => {
    it('should fetch managed resources', async () => {
      const mockResources = {
        items: [
          { kind: 'Deployment', name: 'web', namespace: 'default' },
        ],
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockResources } as any)

      const result = await applicationsApi.getManagedResources('my-app')

      expect(api.get).toHaveBeenCalledWith('/applications/my-app/managed-resources')
      expect(result).toEqual(mockResources)
    })
  })
})

describe('Application React Query Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  describe('useApplications()', () => {
    it('should fetch all applications', async () => {
      const mockApps = {
        metadata: {},
        items: [{ metadata: { name: 'app1' } }],
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockApps } as any)

      const { result } = renderHook(() => useApplications(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockApps)
    })

    it('should fetch applications with filters', async () => {
      const mockApps = { metadata: {}, items: [] }
      vi.mocked(api.get).mockResolvedValue({ data: mockApps } as any)

      const { result } = renderHook(
        () => useApplications({ project: 'production' }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('project=production'))
    })
  })

  describe('useApplication()', () => {
    it('should fetch single application', async () => {
      const mockApp = { metadata: { name: 'my-app' }, spec: {}, status: {} }
      vi.mocked(api.get).mockResolvedValue({ data: mockApp } as any)

      const { result } = renderHook(() => useApplication('my-app'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockApp)
    })

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useApplication('my-app', false), { wrapper })

      expect(result.current.isFetching).toBe(false)
    })
  })

  describe('useCreateApplication()', () => {
    it('should create application and invalidate queries', async () => {
      const newApp = {
        metadata: { name: 'new-app' },
        spec: {
          project: 'default',
          source: { repoURL: 'https://github.com/test/repo', targetRevision: 'main', path: '.' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
        },
      }
      vi.mocked(api.post).mockResolvedValue({ data: newApp } as any)

      const { result } = renderHook(() => useCreateApplication(), { wrapper })

      result.current.mutate(newApp as any)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(newApp)
    })
  })

  describe('useUpdateApplication()', () => {
    it('should update application', async () => {
      const updatedApp = {
        metadata: { name: 'my-app', labels: { env: 'prod' } },
      }
      vi.mocked(api.put).mockResolvedValue({ data: updatedApp } as any)

      const { result } = renderHook(() => useUpdateApplication(), { wrapper })

      result.current.mutate({ name: 'my-app', app: updatedApp as any })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(updatedApp)
    })
  })

  describe('useDeleteApplication()', () => {
    it('should delete application', async () => {
      vi.mocked(api.delete).mockResolvedValue({} as any)

      const { result } = renderHook(() => useDeleteApplication(), { wrapper })

      result.current.mutate({ name: 'my-app' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should delete application with cascade', async () => {
      vi.mocked(api.delete).mockResolvedValue({} as any)

      const { result } = renderHook(() => useDeleteApplication(), { wrapper })

      result.current.mutate({ name: 'my-app', cascade: true })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.delete).toHaveBeenCalledWith('/applications/my-app?cascade=true')
    })
  })

  describe('useRefreshApplication()', () => {
    it('should refresh application', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: {} } as any)

      const { result } = renderHook(() => useRefreshApplication(), { wrapper })

      result.current.mutate('my-app')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.get).toHaveBeenCalledWith('/applications/my-app?refresh=normal')
    })
  })

  describe('useResourceTree()', () => {
    it('should fetch resource tree', async () => {
      const mockTree = {
        nodes: [{ kind: 'Deployment', name: 'web' }],
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockTree } as any)

      const { result } = renderHook(() => useResourceTree('my-app'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockTree)
    })

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useResourceTree('my-app', false), { wrapper })

      expect(result.current.isFetching).toBe(false)
    })
  })

  describe('useManagedResources()', () => {
    it('should fetch managed resources', async () => {
      const mockResources = {
        items: [{ kind: 'Deployment', name: 'web' }],
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockResources } as any)

      const { result } = renderHook(() => useManagedResources('my-app'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockResources)
    })

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useManagedResources('my-app', false), { wrapper })

      expect(result.current.isFetching).toBe(false)
    })
  })
})
