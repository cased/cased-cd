import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type { Cluster, ClusterList } from '@/types/api'

// API endpoints
const ENDPOINTS = {
  clusters: '/clusters',
  cluster: (server: string) => `/clusters/${encodeURIComponent(server)}`,
}

// Query Keys
export const clusterKeys = {
  all: ['clusters'] as const,
  lists: () => [...clusterKeys.all, 'list'] as const,
  list: (filters?: ClusterFilters) => [...clusterKeys.lists(), filters] as const,
  details: () => [...clusterKeys.all, 'detail'] as const,
  detail: (server: string) => [...clusterKeys.details(), server] as const,
}

// Types
export interface ClusterFilters {
  name?: string
}

// API Functions
export const clustersApi = {
  // Get all clusters
  getClusters: async (filters?: ClusterFilters): Promise<ClusterList> => {
    const params = new URLSearchParams()
    if (filters?.name) params.append('name', filters.name)

    const response = await api.get<ClusterList>(
      `${ENDPOINTS.clusters}?${params.toString()}`
    )
    return response.data
  },

  // Get single cluster
  getCluster: async (server: string): Promise<Cluster> => {
    const response = await api.get<Cluster>(ENDPOINTS.cluster(server))
    return response.data
  },

  // Create cluster
  createCluster: async (cluster: Cluster): Promise<Cluster> => {
    const response = await api.post<Cluster>(ENDPOINTS.clusters, cluster)
    return response.data
  },

  // Update cluster
  updateCluster: async (server: string, cluster: Partial<Cluster>): Promise<Cluster> => {
    const response = await api.put<Cluster>(ENDPOINTS.cluster(server), cluster)
    return response.data
  },

  // Delete cluster
  deleteCluster: async (server: string): Promise<void> => {
    await api.delete(ENDPOINTS.cluster(server))
  },

  // Test cluster connection
  testCluster: async (cluster: Cluster): Promise<{ status: string }> => {
    const response = await api.post(`${ENDPOINTS.clusters}/validate`, cluster)
    return response.data
  },
}

// React Query Hooks

// Get all clusters
export function useClusters(filters?: ClusterFilters) {
  return useQuery({
    queryKey: clusterKeys.list(filters),
    queryFn: () => clustersApi.getClusters(filters),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get single cluster
export function useCluster(server: string, enabled: boolean = true) {
  return useQuery({
    queryKey: clusterKeys.detail(server),
    queryFn: () => clustersApi.getCluster(server),
    enabled: enabled && !!server,
    staleTime: 30 * 1000,
  })
}

// Create cluster mutation
export function useCreateCluster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clustersApi.createCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clusterKeys.lists() })
    },
  })
}

// Update cluster mutation
export function useUpdateCluster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ server, cluster }: { server: string; cluster: Partial<Cluster> }) =>
      clustersApi.updateCluster(server, cluster),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clusterKeys.detail(variables.server) })
      queryClient.invalidateQueries({ queryKey: clusterKeys.lists() })
    },
  })
}

// Delete cluster mutation
export function useDeleteCluster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (server: string) => clustersApi.deleteCluster(server),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clusterKeys.lists() })
    },
  })
}

// Test cluster mutation
export function useTestCluster() {
  return useMutation({
    mutationFn: clustersApi.testCluster,
  })
}
