import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type { Application, ApplicationList, ManagedResourcesResponse } from '@/types/api'

// API endpoints
const ENDPOINTS = {
  applications: '/applications',
  application: (name: string) => `/applications/${name}`,
  sync: (name: string) => `/applications/${name}/sync`,
  rollback: (name: string) => `/applications/${name}/rollback`,
  resource: (name: string) => `/applications/${name}/resource`,
  resourceTree: (name: string) => `/applications/${name}/resource-tree`,
  managedResources: (name: string) => `/applications/${name}/managed-resources`,
}

// Query Keys
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters?: ApplicationFilters) => [...applicationKeys.lists(), filters] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (name: string) => [...applicationKeys.details(), name] as const,
  resourceTree: (name: string) => [...applicationKeys.all, 'resourceTree', name] as const,
  managedResources: (name: string) => [...applicationKeys.all, 'managedResources', name] as const,
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

export interface ResourceTree {
  nodes?: Array<{
    kind: string
    name: string
    namespace?: string
    status?: string
    health?: {
      status: string
    }
  }>
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

  // Get resource tree (includes pods and all child resources)
  getResourceTree: async (name: string): Promise<ResourceTree> => {
    const response = await api.get<ResourceTree>(ENDPOINTS.resourceTree(name))
    return response.data
  },

  // Get managed resources with diff information
  getManagedResources: async (name: string): Promise<ManagedResourcesResponse> => {
    const response = await api.get<ManagedResourcesResponse>(ENDPOINTS.managedResources(name))
    return response.data
  },
}

// React Query Hooks

// Get all applications
export function useApplications(filters?: ApplicationFilters) {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () => applicationsApi.getApplications(filters),
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Auto-refetch every 10 seconds
    refetchIntervalInBackground: false, // Only when tab is active
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
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: applicationKeys.detail(variables.name) })
      await queryClient.cancelQueries({ queryKey: applicationKeys.lists() })

      // Snapshot the previous value
      const previousApp = queryClient.getQueryData<Application>(applicationKeys.detail(variables.name))
      const previousList = queryClient.getQueryData<ApplicationList>(applicationKeys.lists())

      // Optimistically update to show syncing state
      if (previousApp) {
        queryClient.setQueryData<Application>(applicationKeys.detail(variables.name), {
          ...previousApp,
          status: {
            ...previousApp.status,
            operationState: {
              ...previousApp.status?.operationState,
              phase: 'Running',
              message: 'Sync initiated...',
              startedAt: new Date().toISOString(),
            },
          },
        })
      }

      // Update the app in the list too
      if (previousList) {
        queryClient.setQueryData<ApplicationList>(applicationKeys.lists(), {
          ...previousList,
          items: previousList.items.map((app) =>
            app.metadata.name === variables.name
              ? {
                  ...app,
                  status: {
                    ...app.status,
                    operationState: {
                      ...app.status?.operationState,
                      phase: 'Running',
                      message: 'Sync initiated...',
                      startedAt: new Date().toISOString(),
                    },
                  },
                }
              : app
          ),
        })
      }

      return { previousApp, previousList }
    },
    onSuccess: (_, variables) => {
      // Immediately refetch to get the latest state
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.name) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })

      // Poll for updates for 30 seconds to catch the sync completing
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.name) })
        queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
      }, 2000) // Poll every 2 seconds

      // Stop polling after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval)
      }, 30000)
    },
    onError: (_, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousApp) {
        queryClient.setQueryData(applicationKeys.detail(variables.name), context.previousApp)
      }
      if (context?.previousList) {
        queryClient.setQueryData(applicationKeys.lists(), context.previousList)
      }
    },
  })
}

// Refresh application mutation
export function useRefreshApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => applicationsApi.refreshApplication(name),
    onSuccess: (_, name) => {
      // Immediately refetch to get the refreshed state
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(name) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })

      // Poll for a few seconds to ensure we catch any state changes
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(name) })
        queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
      }, 1000)

      setTimeout(() => {
        clearInterval(pollInterval)
      }, 5000)
    },
  })
}

// Get resource tree (includes pods)
export function useResourceTree(name: string, enabled: boolean = true) {
  return useQuery({
    queryKey: applicationKeys.resourceTree(name),
    queryFn: () => applicationsApi.getResourceTree(name),
    enabled: enabled && !!name,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Auto-refetch every 10 seconds
  })
}

// Get managed resources with diff information
export function useManagedResources(name: string, enabled: boolean = true) {
  return useQuery({
    queryKey: applicationKeys.managedResources(name),
    queryFn: () => applicationsApi.getManagedResources(name),
    enabled: enabled && !!name,
    staleTime: 5 * 1000, // 5 seconds
  })
}
