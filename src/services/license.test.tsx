import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLicense, useHasFeature, useIsEnterprise, licenseApi } from './license'
import api from '@/lib/api-client'
import type { AxiosResponse } from 'axios'
import type { License } from '@/types/api'
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

  describe('licenseApi.getLicense', () => {
    it('should fetch license information successfully', async () => {
      const mockLicense: License = {
        tier: 'enterprise',
        features: ['rbac', 'audit', 'sso'],
        organization: 'Test Org',
        expiresAt: '2025-12-31T23:59:59Z',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const result = await licenseApi.getLicense()

      expect(api.get).toHaveBeenCalledWith('/license')
      expect(result).toEqual(mockLicense)
    })

    it('should throw error on API failure', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('API Error'))

      await expect(licenseApi.getLicense()).rejects.toThrow('API Error')
    })
  })

  describe('useLicense', () => {
    it('should fetch and cache license data', async () => {
      const mockLicense: License = {
        tier: 'enterprise',
        features: ['rbac', 'audit'],
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockLicense)
      expect(api.get).toHaveBeenCalledTimes(1)
    })

    it('should return loading state initially', () => {
      const mockResponse: AxiosResponse<License> = {
        data: { tier: 'free', features: [] },
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

    it('should handle error state', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to fetch'))

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
      expect(result.current.data).toBeUndefined()
    })

    it('should retry on failure', async () => {
      vi.mocked(api.get)
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))

      // Should retry 3 times as configured
      expect(api.get).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })
  })

  describe('useHasFeature', () => {
    it('should return true when feature exists in license', async () => {
      const mockLicense: License = {
        tier: 'enterprise',
        features: ['rbac', 'audit', 'sso'],
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      await waitFor(() => expect(result.current).toBe(true))
    })

    it('should return false when feature does not exist', async () => {
      const mockLicense: License = {
        tier: 'free',
        features: [],
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      await waitFor(() => expect(result.current).toBe(false))
    })

    it('should return false when license is not loaded', () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      expect(result.current).toBe(false)
    })

    it('should return false on license fetch error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to fetch'))

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      // Should return false even when there's an error
      await waitFor(() => expect(result.current).toBe(false))
    })

    it('should check different features correctly', async () => {
      const mockLicense: License = {
        tier: 'enterprise',
        features: ['rbac', 'sso'], // Note: no 'audit'
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValue(mockResponse)

      const { result: rbacResult } = renderHook(() => useHasFeature('rbac'), { wrapper })
      const { result: auditResult } = renderHook(() => useHasFeature('audit'), { wrapper })
      const { result: ssoResult } = renderHook(() => useHasFeature('sso'), { wrapper })

      await waitFor(() => {
        expect(rbacResult.current).toBe(true)
        expect(auditResult.current).toBe(false)
        expect(ssoResult.current).toBe(true)
      })
    })
  })

  describe('useIsEnterprise', () => {
    it('should return true for enterprise tier', async () => {
      const mockLicense: License = {
        tier: 'enterprise',
        features: ['rbac'],
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useIsEnterprise(), { wrapper })

      await waitFor(() => expect(result.current).toBe(true))
    })

    it('should return false for free tier', async () => {
      const mockLicense: License = {
        tier: 'free',
        features: [],
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

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
    it('should cache license data for 5 minutes', async () => {
      const mockLicense: License = {
        tier: 'enterprise',
        features: ['rbac'],
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
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
    it('should handle license with no organization', async () => {
      const mockLicense: License = {
        tier: 'enterprise',
        features: ['rbac'],
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.organization).toBeUndefined()
    })

    it('should handle license with no expiration', async () => {
      const mockLicense: License = {
        tier: 'enterprise',
        features: ['rbac'],
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.expiresAt).toBeUndefined()
    })

    it('should handle empty features array', async () => {
      const mockLicense: License = {
        tier: 'free',
        features: [],
        organization: 'Test Org',
      }

      const mockResponse: AxiosResponse<License> = {
        data: mockLicense,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useHasFeature('rbac'), { wrapper })

      await waitFor(() => expect(result.current).toBe(false))
    })
  })
})
