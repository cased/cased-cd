import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSyncApplication, applicationsApi } from './applications'
import api from '@/lib/api-client'
import type { AxiosResponse } from 'axios'
import React from 'react'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
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
