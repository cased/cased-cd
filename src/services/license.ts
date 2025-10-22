import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { License, FeatureFlag } from '@/types/api'

// API endpoints
const ENDPOINTS = {
  license: '/license',
}

// Query keys
export const licenseKeys = {
  all: ['license'] as const,
  detail: () => [...licenseKeys.all, 'detail'] as const,
}

// API methods
export const licenseApi = {
  // Get license information
  getLicense: async (): Promise<License> => {
    const response = await api.get<License>(ENDPOINTS.license)
    return response.data
  },
}

// React Query Hooks

// Get license information
export function useLicense() {
  return useQuery({
    queryKey: licenseKeys.detail(),
    queryFn: () => licenseApi.getLicense(),
    staleTime: 5 * 60 * 1000, // 5 minutes - cache license info
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3, // Retry on failure since license is critical
  })
}

// Helper hook to check if a specific feature is enabled
export function useHasFeature(feature: FeatureFlag): boolean {
  const { data: license } = useLicense()
  return license?.features.includes(feature) ?? false
}

// Helper hook to check if user is on enterprise tier
export function useIsEnterprise(): boolean {
  const { data: license } = useLicense()
  return license?.tier === 'enterprise'
}
