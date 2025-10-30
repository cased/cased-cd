import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'

// Types
export interface GPGKey {
  keyID: string
  fingerprint?: string
  owner?: string
  keyData?: string
}

export interface GPGKeyList {
  metadata: Record<string, unknown>
  items: GPGKey[] | null
}

export interface CreateGPGKeyRequest {
  keyData: string
}

// API endpoints
const ENDPOINTS = {
  gpgkeys: '/gpgkeys',
  gpgkey: (keyID: string) => `/gpgkeys/${keyID}`,
}

// Query Keys
export const gpgKeyKeys = {
  all: ['gpgkeys'] as const,
  lists: () => [...gpgKeyKeys.all, 'list'] as const,
}

// API Functions
export const gpgKeysApi = {
  // Get all GPG keys
  getGPGKeys: async (): Promise<GPGKeyList> => {
    const response = await api.get<GPGKeyList>(ENDPOINTS.gpgkeys)
    return response.data
  },

  // Create GPG key
  createGPGKey: async (req: CreateGPGKeyRequest): Promise<GPGKey> => {
    const response = await api.post<GPGKey>(ENDPOINTS.gpgkeys, req)
    return response.data
  },

  // Delete GPG key
  deleteGPGKey: async (keyID: string): Promise<void> => {
    await api.delete(ENDPOINTS.gpgkey(keyID))
  },
}

// React Query Hooks

// Get all GPG keys
export function useGPGKeys() {
  return useQuery({
    queryKey: gpgKeyKeys.lists(),
    queryFn: () => gpgKeysApi.getGPGKeys(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Create GPG key mutation
export function useCreateGPGKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: gpgKeysApi.createGPGKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gpgKeyKeys.lists() })
    },
  })
}

// Delete GPG key mutation
export function useDeleteGPGKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (keyID: string) => gpgKeysApi.deleteGPGKey(keyID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gpgKeyKeys.lists() })
    },
  })
}
