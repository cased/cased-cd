/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { repositoryKeys, repositoriesApi, useRepositories, useRepository, useCreateRepository, useUpdateRepository, useDeleteRepository, useTestRepository } from './repositories'
import api from '@/lib/api-client'
import type { Repository, RepositoryList } from '@/types/api'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Repositories Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Keys', () => {
    it('should generate correct query keys structure', () => {
      expect(repositoryKeys.all).toEqual(['repositories'])
      expect(repositoryKeys.lists()).toEqual(['repositories', 'list'])
      expect(repositoryKeys.list({ name: 'test' })).toEqual(['repositories', 'list', { name: 'test' }])
      expect(repositoryKeys.details()).toEqual(['repositories', 'detail'])
      expect(repositoryKeys.detail('https://github.com/argoproj/argocd-example-apps')).toEqual([
        'repositories',
        'detail',
        'https://github.com/argoproj/argocd-example-apps',
      ])
    })

    it('should generate list key with type filter', () => {
      expect(repositoryKeys.list({ type: 'git' })).toEqual(['repositories', 'list', { type: 'git' }])
    })

    it('should generate list key with multiple filters', () => {
      const filters = { type: 'helm' as const, name: 'bitnami' }
      expect(repositoryKeys.list(filters)).toEqual(['repositories', 'list', filters])
    })
  })

  describe('API Functions', () => {
    const mockRepo: Repository = {
      repo: 'https://github.com/argoproj/argocd-example-apps',
      name: 'argocd-example-apps',
      type: 'git',
      username: '',
      password: '',
      insecure: false,
      enableLfs: false,
      connectionState: {
        status: 'Successful',
        message: 'Repository is reachable',
      },
    }

    const mockRepoList: RepositoryList = {
      items: [mockRepo],
      metadata: {},
    }

    describe('getRepositories()', () => {
      it('should fetch repositories without filters', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockRepoList } as any)

        const result = await repositoriesApi.getRepositories()

        expect(api.get).toHaveBeenCalledWith('/repositories?')
        expect(result).toEqual(mockRepoList)
      })

      it('should fetch repositories with type filter', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockRepoList } as any)

        const result = await repositoriesApi.getRepositories({ type: 'git' })

        expect(api.get).toHaveBeenCalledWith('/repositories?type=git')
        expect(result).toEqual(mockRepoList)
      })

      it('should fetch repositories with name filter', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockRepoList } as any)

        const result = await repositoriesApi.getRepositories({ name: 'argocd' })

        expect(api.get).toHaveBeenCalledWith('/repositories?name=argocd')
        expect(result).toEqual(mockRepoList)
      })

      it('should fetch repositories with multiple filters', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockRepoList } as any)

        const result = await repositoriesApi.getRepositories({ type: 'helm', name: 'bitnami' })

        expect(api.get).toHaveBeenCalledWith('/repositories?type=helm&name=bitnami')
        expect(result).toEqual(mockRepoList)
      })

      it('should handle empty repository list', async () => {
        const emptyList: RepositoryList = { items: [], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: emptyList } as any)

        const result = await repositoriesApi.getRepositories()

        expect(result.items).toHaveLength(0)
      })
    })

    describe('getRepository()', () => {
      it('should fetch single repository by URL', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockRepo } as any)

        const result = await repositoriesApi.getRepository('https://github.com/argoproj/argocd-example-apps')

        expect(api.get).toHaveBeenCalledWith(
          '/repositories/https%3A%2F%2Fgithub.com%2Fargoproj%2Fargocd-example-apps'
        )
        expect(result).toEqual(mockRepo)
      })

      it('should URL-encode repository URL parameter', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockRepo } as any)

        await repositoriesApi.getRepository('https://helm.example.com/charts')

        expect(api.get).toHaveBeenCalledWith('/repositories/https%3A%2F%2Fhelm.example.com%2Fcharts')
      })
    })

    describe('createRepository()', () => {
      it('should create a new repository', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockRepo } as any)

        const result = await repositoriesApi.createRepository(mockRepo)

        expect(api.post).toHaveBeenCalledWith('/repositories', mockRepo)
        expect(result).toEqual(mockRepo)
      })

      it('should create helm repository', async () => {
        const helmRepo: Repository = {
          ...mockRepo,
          repo: 'https://charts.bitnami.com/bitnami',
          name: 'bitnami',
          type: 'helm',
        }
        vi.mocked(api.post).mockResolvedValue({ data: helmRepo } as any)

        const result = await repositoriesApi.createRepository(helmRepo)

        expect(api.post).toHaveBeenCalledWith('/repositories', helmRepo)
        expect(result.type).toBe('helm')
      })
    })

    describe('updateRepository()', () => {
      it('should update an existing repository', async () => {
        const updatedRepo = { ...mockRepo, name: 'updated-repo' }
        vi.mocked(api.put).mockResolvedValue({ data: updatedRepo } as any)

        const result = await repositoriesApi.updateRepository(mockRepo.repo, { name: 'updated-repo' })

        expect(api.put).toHaveBeenCalledWith(
          '/repositories/https%3A%2F%2Fgithub.com%2Fargoproj%2Fargocd-example-apps',
          { name: 'updated-repo' }
        )
        expect(result).toEqual(updatedRepo)
      })

      it('should handle partial repository updates', async () => {
        vi.mocked(api.put).mockResolvedValue({ data: mockRepo } as any)

        await repositoriesApi.updateRepository(mockRepo.repo, { insecure: true })

        const callArgs = vi.mocked(api.put).mock.calls[0]
        expect(callArgs[1]).toEqual({ insecure: true })
      })
    })

    describe('deleteRepository()', () => {
      it('should delete a repository', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await repositoriesApi.deleteRepository(mockRepo.repo)

        expect(api.delete).toHaveBeenCalledWith(
          '/repositories/https%3A%2F%2Fgithub.com%2Fargoproj%2Fargocd-example-apps'
        )
      })

      it('should URL-encode repository URL in delete request', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await repositoriesApi.deleteRepository('https://helm.example.com/charts')

        expect(api.delete).toHaveBeenCalledWith('/repositories/https%3A%2F%2Fhelm.example.com%2Fcharts')
      })
    })

    describe('testRepository()', () => {
      it('should test repository connection successfully', async () => {
        const successResponse = { status: 'Successful' as const, message: 'Repository is reachable' }
        vi.mocked(api.post).mockResolvedValue({ data: successResponse } as any)

        const result = await repositoriesApi.testRepository(mockRepo)

        expect(api.post).toHaveBeenCalledWith('/repositories/validate', mockRepo)
        expect(result).toEqual(successResponse)
        expect(result.status).toBe('Successful')
      })

      it('should handle failed repository connection test', async () => {
        const failedResponse = {
          status: 'Failed' as const,
          message: 'Authentication failed: invalid credentials',
        }
        vi.mocked(api.post).mockResolvedValue({ data: failedResponse } as any)

        const result = await repositoriesApi.testRepository(mockRepo)

        expect(result.status).toBe('Failed')
        expect(result.message).toContain('Authentication failed')
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

    const mockRepo: Repository = {
      repo: 'https://github.com/argoproj/argocd-example-apps',
      name: 'argocd-example-apps',
      type: 'git',
      username: '',
      password: '',
      insecure: false,
      enableLfs: false,
      connectionState: {
        status: 'Successful',
        message: 'Repository is reachable',
      },
    }

    describe('useRepositories()', () => {
      it('should fetch repositories', async () => {
        const mockData: RepositoryList = { items: [mockRepo], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useRepositories(), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(api.get).toHaveBeenCalledWith('/repositories?')
      })

      it('should fetch repositories with type filter', async () => {
        const mockData: RepositoryList = { items: [mockRepo], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useRepositories({ type: 'git' }), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.get).toHaveBeenCalledWith('/repositories?type=git')
      })

      it('should fetch repositories with name filter', async () => {
        const mockData: RepositoryList = { items: [mockRepo], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useRepositories({ name: 'argocd' }), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.get).toHaveBeenCalledWith('/repositories?name=argocd')
      })
    })

    describe('useRepository()', () => {
      it('should fetch single repository', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockRepo } as any)

        const { result } = renderHook(() => useRepository('https://github.com/argoproj/argocd-example-apps'), {
          wrapper,
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockRepo)
      })

      it('should not fetch when enabled is false', async () => {
        const { result } = renderHook(() => useRepository('https://github.com/argoproj/argocd-example-apps', false), {
          wrapper,
        })

        await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))

        expect(api.get).not.toHaveBeenCalled()
      })

      it('should not fetch when URL is empty', async () => {
        const { result } = renderHook(() => useRepository(''), { wrapper })

        await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))

        expect(api.get).not.toHaveBeenCalled()
      })
    })

    describe('useCreateRepository()', () => {
      it('should create repository and invalidate queries', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockRepo } as any)

        const { result } = renderHook(() => useCreateRepository(), { wrapper })

        result.current.mutate(mockRepo)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.post).toHaveBeenCalledWith('/repositories', mockRepo)
        expect(result.current.data).toEqual(mockRepo)
      })
    })

    describe('useUpdateRepository()', () => {
      it('should update repository and invalidate queries', async () => {
        const updatedRepo = { ...mockRepo, name: 'updated' }
        vi.mocked(api.put).mockResolvedValue({ data: updatedRepo } as any)

        const { result } = renderHook(() => useUpdateRepository(), { wrapper })

        result.current.mutate({
          url: mockRepo.repo,
          repo: { name: 'updated' },
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.put).toHaveBeenCalled()
        expect(result.current.data).toEqual(updatedRepo)
      })
    })

    describe('useDeleteRepository()', () => {
      it('should delete repository and invalidate queries', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        const { result } = renderHook(() => useDeleteRepository(), { wrapper })

        result.current.mutate(mockRepo.repo)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.delete).toHaveBeenCalledWith(
          '/repositories/https%3A%2F%2Fgithub.com%2Fargoproj%2Fargocd-example-apps'
        )
      })
    })

    describe('useTestRepository()', () => {
      it('should test repository connection', async () => {
        const testResult = { status: 'Successful' as const, message: 'Repository is reachable' }
        vi.mocked(api.post).mockResolvedValue({ data: testResult } as any)

        const { result } = renderHook(() => useTestRepository(), { wrapper })

        result.current.mutate(mockRepo)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.post).toHaveBeenCalledWith('/repositories/validate', mockRepo)
        expect(result.current.data).toEqual(testResult)
      })
    })
  })
})
