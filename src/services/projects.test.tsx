/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { projectKeys, projectsApi, useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject } from './projects'
import api from '@/lib/api-client'
import type { Project, ProjectList } from '@/types/api'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Projects Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Keys', () => {
    it('should generate correct query keys structure', () => {
      expect(projectKeys.all).toEqual(['projects'])
      expect(projectKeys.lists()).toEqual(['projects', 'list'])
      expect(projectKeys.list({ name: 'test' })).toEqual(['projects', 'list', { name: 'test' }])
      expect(projectKeys.details()).toEqual(['projects', 'detail'])
      expect(projectKeys.detail('default')).toEqual(['projects', 'detail', 'default'])
    })

    it('should generate list key without filters', () => {
      expect(projectKeys.list()).toEqual(['projects', 'list', undefined])
    })
  })

  describe('API Functions', () => {
    const mockProject: Project = {
      metadata: {
        name: 'default',
        namespace: 'argocd',
      },
      spec: {
        sourceRepos: ['*'],
        destinations: [
          {
            server: 'https://kubernetes.default.svc',
            namespace: '*',
          },
        ],
        clusterResourceWhitelist: [{ group: '*', kind: '*' }],
        namespaceResourceBlacklist: [],
      },
    }

    const mockProjectList: ProjectList = {
      items: [mockProject],
      metadata: {},
    }

    describe('getProjects()', () => {
      it('should fetch projects without filters', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockProjectList } as any)

        const result = await projectsApi.getProjects()

        expect(api.get).toHaveBeenCalledWith('/projects?')
        expect(result).toEqual(mockProjectList)
      })

      it('should fetch projects with name filter', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockProjectList } as any)

        const result = await projectsApi.getProjects({ name: 'prod' })

        expect(api.get).toHaveBeenCalledWith('/projects?name=prod')
        expect(result).toEqual(mockProjectList)
      })

      it('should handle empty project list', async () => {
        const emptyList: ProjectList = { items: [], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: emptyList } as any)

        const result = await projectsApi.getProjects()

        expect(result.items).toHaveLength(0)
      })
    })

    describe('getProject()', () => {
      it('should fetch single project by name', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockProject } as any)

        const result = await projectsApi.getProject('default')

        expect(api.get).toHaveBeenCalledWith('/projects/default')
        expect(result).toEqual(mockProject)
      })

      it('should URL-encode project name with special characters', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockProject } as any)

        await projectsApi.getProject('my-project-123')

        expect(api.get).toHaveBeenCalledWith('/projects/my-project-123')
      })
    })

    describe('createProject()', () => {
      it('should create a new project', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockProject } as any)

        const result = await projectsApi.createProject(mockProject)

        expect(api.post).toHaveBeenCalledWith('/projects', { project: mockProject })
        expect(result).toEqual(mockProject)
      })

      it('should wrap project in request body', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockProject } as any)

        const newProject: Project = {
          ...mockProject,
          metadata: { ...mockProject.metadata, name: 'new-project' },
        }

        await projectsApi.createProject(newProject)

        const callArgs = vi.mocked(api.post).mock.calls[0]
        expect(callArgs[1]).toEqual({ project: newProject })
      })
    })

    describe('updateProject()', () => {
      it('should update an existing project', async () => {
        const updatedProject = {
          ...mockProject,
          spec: { ...mockProject.spec, sourceRepos: ['*'] },
        }
        vi.mocked(api.put).mockResolvedValue({ data: updatedProject } as any)

        const result = await projectsApi.updateProject('default', { spec: { sourceRepos: ['https://github.com/org/repo'] } })

        expect(api.put).toHaveBeenCalledWith('/projects/default', { spec: { sourceRepos: ['https://github.com/org/repo'] } })
        expect(result).toEqual(updatedProject)
      })

      it('should handle partial project updates', async () => {
        vi.mocked(api.put).mockResolvedValue({ data: mockProject } as any)

        await projectsApi.updateProject('default', { spec: { sourceRepos: ['*'] } })

        const callArgs = vi.mocked(api.put).mock.calls[0]
        expect(callArgs[1]).toEqual({ spec: { sourceRepos: ['*'] } })
      })

      it('should URL-encode project name in update request', async () => {
        vi.mocked(api.put).mockResolvedValue({ data: mockProject } as any)

        await projectsApi.updateProject('my-project', { spec: { sourceRepos: ['*'] } })

        expect(api.put).toHaveBeenCalledWith('/projects/my-project', { spec: { sourceRepos: ['*'] } })
      })
    })

    describe('deleteProject()', () => {
      it('should delete a project', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await projectsApi.deleteProject('default')

        expect(api.delete).toHaveBeenCalledWith('/projects/default')
      })

      it('should URL-encode project name in delete request', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await projectsApi.deleteProject('prod-project')

        expect(api.delete).toHaveBeenCalledWith('/projects/prod-project')
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

    const mockProject: Project = {
      metadata: {
        name: 'default',
        namespace: 'argocd',
      },
      spec: {
        sourceRepos: ['*'],
        destinations: [
          {
            server: 'https://kubernetes.default.svc',
            namespace: '*',
          },
        ],
        clusterResourceWhitelist: [{ group: '*', kind: '*' }],
        namespaceResourceBlacklist: [],
      },
    }

    describe('useProjects()', () => {
      it('should fetch projects', async () => {
        const mockData: ProjectList = { items: [mockProject], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useProjects(), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(api.get).toHaveBeenCalledWith('/projects?')
      })

      it('should fetch projects with name filter', async () => {
        const mockData: ProjectList = { items: [mockProject], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useProjects({ name: 'default' }), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.get).toHaveBeenCalledWith('/projects?name=default')
      })
    })

    describe('useProject()', () => {
      it('should fetch single project', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockProject } as any)

        const { result } = renderHook(() => useProject('default'), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockProject)
      })

      it('should not fetch when enabled is false', async () => {
        const { result } = renderHook(() => useProject('default', false), { wrapper })

        await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))

        expect(api.get).not.toHaveBeenCalled()
      })

      it('should not fetch when name is empty', async () => {
        const { result } = renderHook(() => useProject(''), { wrapper })

        await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))

        expect(api.get).not.toHaveBeenCalled()
      })
    })

    describe('useCreateProject()', () => {
      it('should create project and invalidate queries', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockProject } as any)

        const { result } = renderHook(() => useCreateProject(), { wrapper })

        result.current.mutate(mockProject)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.post).toHaveBeenCalledWith('/projects', { project: mockProject })
        expect(result.current.data).toEqual(mockProject)
      })
    })

    describe('useUpdateProject()', () => {
      it('should update project and invalidate queries', async () => {
        const updatedProject = {
          ...mockProject,
          spec: { ...mockProject.spec, sourceRepos: ['*'] },
        }
        vi.mocked(api.put).mockResolvedValue({ data: updatedProject } as any)

        const { result } = renderHook(() => useUpdateProject(), { wrapper })

        result.current.mutate({
          name: 'default',
          project: { spec: { sourceRepos: ['*'] } },
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.put).toHaveBeenCalled()
        expect(result.current.data).toEqual(updatedProject)
      })
    })

    describe('useDeleteProject()', () => {
      it('should delete project and invalidate queries', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        const { result } = renderHook(() => useDeleteProject(), { wrapper })

        result.current.mutate('default')

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.delete).toHaveBeenCalledWith('/projects/default')
      })
    })
  })
})
