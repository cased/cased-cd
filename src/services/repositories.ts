import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type { Repository, RepositoryList } from '@/types/api'

// API endpoints
const ENDPOINTS = {
  repositories: '/repositories',
  repository: (url: string) => `/repositories/${encodeURIComponent(url)}`,
}

// Query Keys
export const repositoryKeys = {
  all: ['repositories'] as const,
  lists: () => [...repositoryKeys.all, 'list'] as const,
  list: (filters?: RepositoryFilters) => [...repositoryKeys.lists(), filters] as const,
  details: () => [...repositoryKeys.all, 'detail'] as const,
  detail: (url: string) => [...repositoryKeys.details(), url] as const,
}

// Types
export interface RepositoryFilters {
  type?: 'git' | 'helm' | 'oci'
  name?: string
}

// API Functions
export const repositoriesApi = {
  // Get all repositories
  getRepositories: async (filters?: RepositoryFilters): Promise<RepositoryList> => {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.name) params.append('name', filters.name)

    const response = await api.get<RepositoryList>(
      `${ENDPOINTS.repositories}?${params.toString()}`
    )
    return response.data
  },

  // Get single repository
  getRepository: async (url: string): Promise<Repository> => {
    const response = await api.get<Repository>(ENDPOINTS.repository(url))
    return response.data
  },

  // Create repository
  createRepository: async (repo: Repository): Promise<Repository> => {
    const response = await api.post<Repository>(ENDPOINTS.repositories, repo)
    return response.data
  },

  // Update repository
  updateRepository: async (url: string, repo: Partial<Repository>): Promise<Repository> => {
    const response = await api.put<Repository>(ENDPOINTS.repository(url), repo)
    return response.data
  },

  // Delete repository
  deleteRepository: async (url: string): Promise<void> => {
    // Use path parameter only - ArgoCD API doesn't support appProject query param
    await api.delete(ENDPOINTS.repository(url))
  },

  // Test repository connection
  testRepository: async (repo: Repository): Promise<{ status: 'Successful' | 'Failed'; message?: string }> => {
    const response = await api.post<{ status: 'Successful' | 'Failed'; message?: string }>(`${ENDPOINTS.repositories}/validate`, repo)
    return response.data
  },
}

// React Query Hooks

// Get all repositories
export function useRepositories(filters?: RepositoryFilters) {
  return useQuery({
    queryKey: repositoryKeys.list(filters),
    queryFn: () => repositoriesApi.getRepositories(filters),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get single repository
export function useRepository(url: string, enabled: boolean = true) {
  return useQuery({
    queryKey: repositoryKeys.detail(url),
    queryFn: () => repositoriesApi.getRepository(url),
    enabled: enabled && !!url,
    staleTime: 30 * 1000,
  })
}

// Create repository mutation
export function useCreateRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: repositoriesApi.createRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repositoryKeys.lists() })
    },
  })
}

// Update repository mutation
export function useUpdateRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ url, repo }: { url: string; repo: Partial<Repository> }) =>
      repositoriesApi.updateRepository(url, repo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: repositoryKeys.detail(variables.url) })
      queryClient.invalidateQueries({ queryKey: repositoryKeys.lists() })
    },
  })
}

// Delete repository mutation
export function useDeleteRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (url: string) => repositoriesApi.deleteRepository(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repositoryKeys.lists() })
    },
  })
}

// Test repository mutation
export function useTestRepository() {
  return useMutation({
    mutationFn: repositoriesApi.testRepository,
  })
}
