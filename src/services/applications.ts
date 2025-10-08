import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type { Application, ApplicationList } from '@/types/api'

// API endpoints
const ENDPOINTS = {
  applications: '/applications',
  application: (name: string) => `/applications/${name}`,
  sync: (name: string) => `/applications/${name}/sync`,
  rollback: (name: string) => `/applications/${name}/rollback`,
  resource: (name: string) => `/applications/${name}/resource`,
}

// Query Keys
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters?: ApplicationFilters) => [...applicationKeys.lists(), filters] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (name: string) => [...applicationKeys.details(), name] as const,
}

// Types
export interface ApplicationFilters {
  project?: string
  cluster?: string
  namespace?: string
  name?: string
  health?: string
  sync?: string
}

// API Functions
export const applicationsApi = {
  // Get all applications
  getApplications: async (filters?: ApplicationFilters): Promise<ApplicationList> => {
    const params = new URLSearchParams()
    if (filters?.project) params.append('project', filters.project)
    if (filters?.cluster) params.append('cluster', filters.cluster)
    if (filters?.namespace) params.append('namespace', filters.namespace)
    if (filters?.name) params.append('name', filters.name)

    const response = await api.get<ApplicationList>(
      `${ENDPOINTS.applications}?${params.toString()}`
    )
    return response.data
  },

  // Get single application
  getApplication: async (name: string): Promise<Application> => {
    const response = await api.get<Application>(ENDPOINTS.application(name))
    return response.data
  },

  // Create application
  createApplication: async (app: Application): Promise<Application> => {
    const response = await api.post<Application>(ENDPOINTS.applications, app)
    return response.data
  },

  // Update application
  updateApplication: async (name: string, app: Partial<Application>): Promise<Application> => {
    const response = await api.put<Application>(ENDPOINTS.application(name), app)
    return response.data
  },

  // Delete application
  deleteApplication: async (name: string, cascade?: boolean): Promise<void> => {
    const params = cascade ? '?cascade=true' : ''
    await api.delete(ENDPOINTS.application(name) + params)
  },

  // Sync application
  syncApplication: async (name: string, prune?: boolean, dryRun?: boolean): Promise<void> => {
    await api.post(ENDPOINTS.sync(name), {
      prune,
      dryRun,
      strategy: { hook: {} },
    })
  },

  // Refresh application
  refreshApplication: async (name: string): Promise<void> => {
    await api.get(`${ENDPOINTS.application(name)}?refresh=normal`)
  },
}

// React Query Hooks

// Get all applications
export function useApplications(filters?: ApplicationFilters) {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () => applicationsApi.getApplications(filters),
    staleTime: 10 * 1000, // 10 seconds
  })
}

// Get single application
export function useApplication(name: string, enabled: boolean = true) {
  return useQuery({
    queryKey: applicationKeys.detail(name),
    queryFn: () => applicationsApi.getApplication(name),
    enabled: enabled && !!name,
    staleTime: 5 * 1000, // 5 seconds
  })
}

// Create application mutation
export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applicationsApi.createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

// Update application mutation
export function useUpdateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, app }: { name: string; app: Partial<Application> }) =>
      applicationsApi.updateApplication(name, app),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.name) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

// Delete application mutation
export function useDeleteApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, cascade }: { name: string; cascade?: boolean }) =>
      applicationsApi.deleteApplication(name, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

// Sync application mutation
export function useSyncApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, prune, dryRun }: { name: string; prune?: boolean; dryRun?: boolean }) =>
      applicationsApi.syncApplication(name, prune, dryRun),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.name) })
    },
  })
}

// Refresh application mutation
export function useRefreshApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => applicationsApi.refreshApplication(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(name) })
    },
  })
}
