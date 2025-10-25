import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type { AuditEventList, AuditEventFilters } from '@/types/api'

// API endpoints
const ENDPOINTS = {
  audit: '/settings/audit',
}

// Query Keys
export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  filtered: (filters: AuditEventFilters) => [...auditKeys.lists(), filters] as const,
}

// API Functions
export const auditApi = {
  // Get audit events with optional filters
  getAuditEvents: async (filters?: AuditEventFilters): Promise<AuditEventList> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.user) params.append('user', filters.user)
      if (filters.action) params.append('action', filters.action)
      if (filters.resourceType) params.append('resourceType', filters.resourceType)
      if (filters.resourceName) params.append('resourceName', filters.resourceName)
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.success !== undefined) params.append('success', filters.success.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())
    }

    const url = params.toString() ? `${ENDPOINTS.audit}?${params.toString()}` : ENDPOINTS.audit
    const response = await api.get<AuditEventList>(url)
    return response.data
  },
}

// React Query Hooks

// Get audit events with filters
export function useAuditEvents(filters?: AuditEventFilters) {
  return useQuery({
    queryKey: auditKeys.filtered(filters || {}),
    queryFn: () => auditApi.getAuditEvents(filters),
    staleTime: 10 * 1000, // 10 seconds - audit events are mostly append-only
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds to show new events
  })
}
