import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { License, FeatureFlag, LicenseTier } from '@/types/api'

// API endpoints
const ENDPOINTS = {
  rbacCheck: '/settings/rbac', // Check if RBAC endpoint exists to detect enterprise
}

// Query keys
export const licenseKeys = {
  all: ['license'] as const,
  detail: () => [...licenseKeys.all, 'detail'] as const,
  enterpriseCheck: () => [...licenseKeys.all, 'enterprise-check'] as const,
}

// Dev-only license override (stored in localStorage)
const DEV_OVERRIDE_KEY = 'dev_license_override'

export const devLicenseOverride = {
  get: (): LicenseTier | null => {
    if (!import.meta.env.DEV) return null
    const override = localStorage.getItem(DEV_OVERRIDE_KEY)
    return override as LicenseTier | null
  },
  set: (tier: LicenseTier | null) => {
    if (!import.meta.env.DEV) return
    if (tier === null) {
      localStorage.removeItem(DEV_OVERRIDE_KEY)
    } else {
      localStorage.setItem(DEV_OVERRIDE_KEY, tier)
    }
  },
}

// API methods
export const licenseApi = {
  // Check if enterprise features are available by checking RBAC endpoint
  checkEnterprise: async (): Promise<License> => {
    // In dev mode, check for override first
    if (import.meta.env.DEV) {
      const override = devLicenseOverride.get()
      if (override === 'enterprise') {
        return {
          tier: 'enterprise',
          features: ['rbac', 'sso', 'audit', 'notifications'],
        }
      } else if (override === 'free') {
        return {
          tier: 'free',
          features: [],
        }
      }
    }

    try {
      // Try to access the RBAC endpoint - only available in enterprise
      await api.get(ENDPOINTS.rbacCheck)

      // If successful, return enterprise license
      return {
        tier: 'enterprise',
        features: ['rbac', 'sso', 'audit', 'notifications'],
      }
    } catch {
      // If endpoint doesn't exist (404) or any other error, return free license
      return {
        tier: 'free',
        features: [],
      }
    }
  },
}

// React Query Hooks

// Get license information (enterprise detection via RBAC endpoint check)
export function useLicense() {
  return useQuery({
    queryKey: licenseKeys.enterpriseCheck(),
    queryFn: () => licenseApi.checkEnterprise(),
    staleTime: Infinity, // Cache forever - tier doesn't change during session
    gcTime: Infinity,
    retry: false, // Don't retry - a 404 is expected for standard tier
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
