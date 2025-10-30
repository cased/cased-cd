import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type { Project, ProjectList } from '@/types/api'

// API endpoints
const ENDPOINTS = {
  projects: '/projects',
  project: (name: string) => `/projects/${encodeURIComponent(name)}`,
}

// Query Keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (name: string) => [...projectKeys.details(), name] as const,
}

// Types
export interface ProjectFilters {
  name?: string
}

// API Functions
export const projectsApi = {
  // Get all projects
  getProjects: async (filters?: ProjectFilters): Promise<ProjectList> => {
    const params = new URLSearchParams()
    if (filters?.name) params.append('name', filters.name)

    const response = await api.get<ProjectList>(
      `${ENDPOINTS.projects}?${params.toString()}`
    )
    return response.data
  },

  // Get single project
  getProject: async (name: string): Promise<Project> => {
    const response = await api.get<Project>(ENDPOINTS.project(name))
    return response.data
  },

  // Create project
  createProject: async (project: Project): Promise<Project> => {
    const response = await api.post<Project>(ENDPOINTS.projects, { project })
    return response.data
  },

  // Update project
  updateProject: async (name: string, project: Partial<Project>): Promise<Project> => {
    const response = await api.put<Project>(ENDPOINTS.project(name), project)
    return response.data
  },

  // Delete project
  deleteProject: async (name: string): Promise<void> => {
    await api.delete(ENDPOINTS.project(name))
  },
}

// React Query Hooks

// Get all projects
export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => projectsApi.getProjects(filters),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get single project
export function useProject(name: string, enabled: boolean = true) {
  return useQuery({
    queryKey: projectKeys.detail(name),
    queryFn: () => projectsApi.getProject(name),
    enabled: enabled && !!name,
    staleTime: 30 * 1000,
  })
}

// Create project mutation
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// Update project mutation
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, project }: { name: string; project: Partial<Project> }) =>
      projectsApi.updateProject(name, project),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.name) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// Delete project mutation
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => projectsApi.deleteProject(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}
