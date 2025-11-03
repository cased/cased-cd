/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { clusterKeys, clustersApi, useClusters, useCluster, useCreateCluster, useUpdateCluster, useDeleteCluster, useTestCluster } from './clusters'
import api from '@/lib/api-client'
import type { Cluster, ClusterList } from '@/types/api'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Clusters Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Keys', () => {
    it('should generate correct query keys structure', () => {
      expect(clusterKeys.all).toEqual(['clusters'])
      expect(clusterKeys.lists()).toEqual(['clusters', 'list'])
      expect(clusterKeys.list({ name: 'test' })).toEqual(['clusters', 'list', { name: 'test' }])
      expect(clusterKeys.details()).toEqual(['clusters', 'detail'])
      expect(clusterKeys.detail('https://kubernetes.default.svc')).toEqual(['clusters', 'detail', 'https://kubernetes.default.svc'])
    })

    it('should generate list key without filters', () => {
      expect(clusterKeys.list()).toEqual(['clusters', 'list', undefined])
    })

    it('should generate list key with filters', () => {
      const filters = { name: 'prod-cluster' }
      expect(clusterKeys.list(filters)).toEqual(['clusters', 'list', filters])
    })
  })

  describe('API Functions', () => {
    const mockCluster: Cluster = {
      server: 'https://kubernetes.default.svc',
      name: 'in-cluster',
      config: {
        bearerToken: 'token',
        tlsClientConfig: {
          insecure: false,
        },
      },
      connectionState: {
        status: 'Successful',
        message: 'Cluster connection successful',
      },
      serverVersion: '1.28',
      info: {
        connectionState: {
          status: 'Successful',
          message: 'Cluster connection successful',
        },
        serverVersion: '1.28',
        applicationsCount: 5,
      },
    }

    const mockClusterList: ClusterList = {
      items: [mockCluster],
      metadata: {},
    }

    describe('getClusters()', () => {
      it('should fetch clusters without filters', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockClusterList } as any)

        const result = await clustersApi.getClusters()

        expect(api.get).toHaveBeenCalledWith('/clusters?')
        expect(result).toEqual(mockClusterList)
      })

      it('should fetch clusters with name filter', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockClusterList } as any)

        const filters = { name: 'prod' }
        const result = await clustersApi.getClusters(filters)

        expect(api.get).toHaveBeenCalledWith('/clusters?name=prod')
        expect(result).toEqual(mockClusterList)
      })

      it('should handle empty cluster list', async () => {
        const emptyList: ClusterList = { items: [], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: emptyList } as any)

        const result = await clustersApi.getClusters()

        expect(result.items).toHaveLength(0)
      })
    })

    describe('getCluster()', () => {
      it('should fetch single cluster by server URL', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockCluster } as any)

        const result = await clustersApi.getCluster('https://kubernetes.default.svc')

        expect(api.get).toHaveBeenCalledWith('/clusters/https%3A%2F%2Fkubernetes.default.svc')
        expect(result).toEqual(mockCluster)
      })

      it('should URL-encode server parameter', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockCluster } as any)

        await clustersApi.getCluster('https://10.0.0.1:6443')

        expect(api.get).toHaveBeenCalledWith('/clusters/https%3A%2F%2F10.0.0.1%3A6443')
      })
    })

    describe('createCluster()', () => {
      it('should create a new cluster', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockCluster } as any)

        const result = await clustersApi.createCluster(mockCluster)

        expect(api.post).toHaveBeenCalledWith('/clusters', mockCluster)
        expect(result).toEqual(mockCluster)
      })

      it('should send cluster configuration in request body', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockCluster } as any)

        const newCluster: Cluster = {
          ...mockCluster,
          name: 'new-cluster',
          server: 'https://new-cluster.example.com:6443',
        }

        await clustersApi.createCluster(newCluster)

        expect(api.post).toHaveBeenCalledWith('/clusters', newCluster)
      })
    })

    describe('updateCluster()', () => {
      it('should update an existing cluster', async () => {
        const updatedCluster = { ...mockCluster, name: 'updated-cluster' }
        vi.mocked(api.put).mockResolvedValue({ data: updatedCluster } as any)

        const result = await clustersApi.updateCluster('https://kubernetes.default.svc', { name: 'updated-cluster' })

        expect(api.put).toHaveBeenCalledWith('/clusters/https%3A%2F%2Fkubernetes.default.svc', { name: 'updated-cluster' })
        expect(result).toEqual(updatedCluster)
      })

      it('should handle partial cluster updates', async () => {
        vi.mocked(api.put).mockResolvedValue({ data: mockCluster } as any)

        await clustersApi.updateCluster('https://kubernetes.default.svc', { name: 'new-name' })

        const callArgs = vi.mocked(api.put).mock.calls[0]
        expect(callArgs[1]).toEqual({ name: 'new-name' })
      })
    })

    describe('deleteCluster()', () => {
      it('should delete a cluster', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await clustersApi.deleteCluster('https://kubernetes.default.svc')

        expect(api.delete).toHaveBeenCalledWith('/clusters/https%3A%2F%2Fkubernetes.default.svc')
      })

      it('should URL-encode server in delete request', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await clustersApi.deleteCluster('https://prod-cluster.example.com:6443')

        expect(api.delete).toHaveBeenCalledWith('/clusters/https%3A%2F%2Fprod-cluster.example.com%3A6443')
      })
    })

    describe('testCluster()', () => {
      it('should test cluster connection successfully', async () => {
        const successResponse = { status: 'Successful' as const, message: 'Connection successful' }
        vi.mocked(api.post).mockResolvedValue({ data: successResponse } as any)

        const result = await clustersApi.testCluster(mockCluster)

        expect(api.post).toHaveBeenCalledWith('/clusters/validate', mockCluster)
        expect(result).toEqual(successResponse)
        expect(result.status).toBe('Successful')
      })

      it('should handle failed cluster connection test', async () => {
        const failedResponse = { status: 'Failed' as const, message: 'Connection failed: timeout' }
        vi.mocked(api.post).mockResolvedValue({ data: failedResponse } as any)

        const result = await clustersApi.testCluster(mockCluster)

        expect(result.status).toBe('Failed')
        expect(result.message).toContain('timeout')
      })
    })
  })

  describe('React Query Hooks', () => {
    let queryClient: QueryClient

    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const mockCluster: Cluster = {
      server: 'https://kubernetes.default.svc',
      name: 'in-cluster',
      config: {
        bearerToken: 'token',
        tlsClientConfig: { insecure: false },
      },
      connectionState: {
        status: 'Successful',
        message: 'Cluster connection successful',
      },
      serverVersion: '1.28',
      info: {
        connectionState: { status: 'Successful', message: 'Connected' },
        serverVersion: '1.28',
        applicationsCount: 5,
      },
    }

    describe('useClusters()', () => {
      it('should fetch clusters', async () => {
        const mockData: ClusterList = { items: [mockCluster], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useClusters(), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(api.get).toHaveBeenCalledWith('/clusters?')
      })

      it('should fetch clusters with filters', async () => {
        const mockData: ClusterList = { items: [mockCluster], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useClusters({ name: 'prod' }), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.get).toHaveBeenCalledWith('/clusters?name=prod')
      })
    })

    describe('useCluster()', () => {
      it('should fetch single cluster', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockCluster } as any)

        const { result } = renderHook(() => useCluster('https://kubernetes.default.svc'), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockCluster)
      })

      it('should not fetch when enabled is false', async () => {
        const { result } = renderHook(() => useCluster('https://kubernetes.default.svc', false), { wrapper })

        await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))

        expect(api.get).not.toHaveBeenCalled()
      })

      it('should not fetch when server is empty', async () => {
        const { result } = renderHook(() => useCluster(''), { wrapper })

        await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))

        expect(api.get).not.toHaveBeenCalled()
      })
    })

    describe('useCreateCluster()', () => {
      it('should create cluster and invalidate queries', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockCluster } as any)

        const { result } = renderHook(() => useCreateCluster(), { wrapper })

        result.current.mutate(mockCluster)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.post).toHaveBeenCalledWith('/clusters', mockCluster)
        expect(result.current.data).toEqual(mockCluster)
      })
    })

    describe('useUpdateCluster()', () => {
      it('should update cluster and invalidate queries', async () => {
        const updatedCluster = { ...mockCluster, name: 'updated' }
        vi.mocked(api.put).mockResolvedValue({ data: updatedCluster } as any)

        const { result } = renderHook(() => useUpdateCluster(), { wrapper })

        result.current.mutate({
          server: 'https://kubernetes.default.svc',
          cluster: { name: 'updated' },
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.put).toHaveBeenCalled()
        expect(result.current.data).toEqual(updatedCluster)
      })
    })

    describe('useDeleteCluster()', () => {
      it('should delete cluster and invalidate queries', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        const { result } = renderHook(() => useDeleteCluster(), { wrapper })

        result.current.mutate('https://kubernetes.default.svc')

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.delete).toHaveBeenCalledWith('/clusters/https%3A%2F%2Fkubernetes.default.svc')
      })
    })

    describe('useTestCluster()', () => {
      it('should test cluster connection', async () => {
        const testResult = { status: 'Successful' as const, message: 'Connected' }
        vi.mocked(api.post).mockResolvedValue({ data: testResult } as any)

        const { result } = renderHook(() => useTestCluster(), { wrapper })

        result.current.mutate(mockCluster)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.post).toHaveBeenCalledWith('/clusters/validate', mockCluster)
        expect(result.current.data).toEqual(testResult)
      })
    })
  })
})
