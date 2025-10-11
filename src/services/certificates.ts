import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'

// Types
export interface Certificate {
  serverName: string
  certType: string
  certSubType: string
  certData: string | null
  certInfo: string
}

export interface CertificateList {
  metadata: Record<string, unknown>
  items: Certificate[]
}

export interface CreateCertificateRequest {
  serverName: string
  certType: 'ssh' | 'https'
  certData: string
  certInfo?: string
}

// API endpoints
const ENDPOINTS = {
  certificates: '/certificates',
  certificate: (serverName: string, certType: string, certSubType: string) =>
    `/certificates/${encodeURIComponent(serverName)}/${certType}/${certSubType}`,
}

// Query Keys
export const certificateKeys = {
  all: ['certificates'] as const,
  lists: () => [...certificateKeys.all, 'list'] as const,
}

// API Functions
export const certificatesApi = {
  // Get all certificates
  getCertificates: async (): Promise<CertificateList> => {
    const response = await api.get<CertificateList>(ENDPOINTS.certificates)
    return response.data
  },

  // Create certificate
  createCertificate: async (cert: CreateCertificateRequest): Promise<Certificate> => {
    const response = await api.post<Certificate>(ENDPOINTS.certificates, cert)
    return response.data
  },

  // Delete certificate
  deleteCertificate: async (serverName: string, certType: string, certSubType: string): Promise<void> => {
    await api.delete(ENDPOINTS.certificate(serverName, certType, certSubType))
  },
}

// React Query Hooks

// Get all certificates
export function useCertificates() {
  return useQuery({
    queryKey: certificateKeys.lists(),
    queryFn: () => certificatesApi.getCertificates(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Create certificate mutation
export function useCreateCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: certificatesApi.createCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() })
    },
  })
}

// Delete certificate mutation
export function useDeleteCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ serverName, certType, certSubType }: {
      serverName: string
      certType: string
      certSubType: string
    }) => certificatesApi.deleteCertificate(serverName, certType, certSubType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() })
    },
  })
}
