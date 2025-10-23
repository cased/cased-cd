import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLicense, useHasFeature, useIsEnterprise, licenseApi } from './license'
import api from '@/lib/api-client'
import type { AxiosResponse } from 'axios'
import React from 'react'

// Mock the API client
vi.mock('@/lib/api-client', () => {
  const mockApi = {
    get: vi.fn(),
  }
  return {
    default: mockApi,
    api: mockApi,
  }
})

describe('License Service', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          // Disable cache time for tests to ensure fresh queries
          gcTime: 0,
          staleTime: 0,
        },
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

  describe('licenseApi.checkEnterprise', () => {
    it('should return enterprise license when RBAC endpoint is accessible', async () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const result = await licenseApi.checkEnterprise()

      expect(api.get).toHaveBeenCalledWith('/settings/rbac')
      expect(result).toEqual({
        tier: 'enterprise',
        features: ['rbac', 'sso', 'audit'],
      })
    })

    it('should return free license when RBAC endpoint is not accessible', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('404 Not Found'))

      const result = await licenseApi.checkEnterprise()

      expect(result).toEqual({
        tier: 'free',
        features: [],
      })
    })
  })

  describe('useLicense', () => {
    it('should detect enterprise tier when RBAC endpoint exists', async () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({
        tier: 'enterprise',
        features: ['rbac', 'sso', 'audit'],
      })
      expect(api.get).toHaveBeenCalledTimes(1)
      expect(api.get).toHaveBeenCalledWith('/settings/rbac')
    })

    it('should detect free tier when RBAC endpoint does not exist', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('404 Not Found'))

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({
        tier: 'free',
        features: [],
      })
    })

    it('should return loading state initially', () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useLicense(), { wrapper })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('useHasFeature', () => {
    it('should return true when feature exists in enterprise tier', async () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      await waitFor(
        () => expect(result.current).toBe(true),
        { timeout: 3000 }
      )
    })

    it('should return false when feature does not exist in free tier', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('404 Not Found'))

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      await waitFor(() => expect(result.current).toBe(false))
    })

    it('should return false when license is not loaded', () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      expect(result.current).toBe(false)
    })

    it('should return false on endpoint check failure', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      // Should return false when RBAC endpoint is not accessible (free tier)
      await waitFor(() => expect(result.current).toBe(false))
    })

    it('should check different features correctly in enterprise tier', async () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValue(mockResponse)

      const { result: rbacResult } = renderHook(() => useHasFeature('rbac'), { wrapper })
      const { result: ssoResult } = renderHook(() => useHasFeature('sso'), { wrapper })
      const { result: auditResult } = renderHook(() => useHasFeature('audit'), { wrapper })

      await waitFor(
        () => {
          expect(rbacResult.current).toBe(true)
          expect(ssoResult.current).toBe(true)
          expect(auditResult.current).toBe(true)
        },
        { timeout: 3000 }
      )
    })
  })

  describe('useIsEnterprise', () => {
    it('should return true when RBAC endpoint exists', async () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useIsEnterprise(), { wrapper })

      await waitFor(() => expect(result.current).toBe(true))
    })

    it('should return false when RBAC endpoint does not exist', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('404 Not Found'))

      const { result } = renderHook(() => useIsEnterprise(), { wrapper })

      await waitFor(() => expect(result.current).toBe(false))
    })

    it('should return false when license is not loaded', () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useIsEnterprise(), { wrapper })

      expect(result.current).toBe(false)
    })
  })

  describe('Caching behavior', () => {
    it('should cache enterprise detection result forever', async () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValue(mockResponse)

      // First hook
      const { result: result1 } = renderHook(() => useLicense(), { wrapper })
      await waitFor(() => expect(result1.current.isSuccess).toBe(true))

      // Second hook - should use cached data
      const { result: result2 } = renderHook(() => useLicense(), { wrapper })
      await waitFor(() => expect(result2.current.isSuccess).toBe(true))

      // Should only call API once due to caching
      expect(api.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle free tier with empty features', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('404 Not Found'))

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      await waitFor(() => expect(result.current).toBe(false))
    })

    it('should handle network errors as free tier', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({
        tier: 'free',
        features: [],
      })
    })

    it('should detect enterprise even if RBAC endpoint returns empty data', async () => {
      const mockResponse: AxiosResponse = {
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({
        tier: 'enterprise',
        features: ['rbac', 'sso', 'audit'],
      })
    })
  })
})
