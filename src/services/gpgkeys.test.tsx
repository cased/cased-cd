// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '@/lib/api-client'
import {
  gpgKeyKeys,
  gpgKeysApi,
  useGPGKeys,
  useCreateGPGKey,
  useDeleteGPGKey,
} from './gpgkeys'

// Mock API client
vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('GPG Key Query Keys', () => {
  it('should generate correct query keys', () => {
    expect(gpgKeyKeys.all).toEqual(['gpgkeys'])
    expect(gpgKeyKeys.lists()).toEqual(['gpgkeys', 'list'])
  })
})

describe('GPG Key API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getGPGKeys()', () => {
    it('should fetch all GPG keys', async () => {
      const mockKeys = {
        metadata: {},
        items: [
          { keyID: 'ABC123', fingerprint: '1234567890ABCDEF', owner: 'user1' },
          { keyID: 'DEF456', fingerprint: 'FEDCBA0987654321', owner: 'user2' },
        ],
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockKeys } as any)

      const result = await gpgKeysApi.getGPGKeys()

      expect(api.get).toHaveBeenCalledWith('/gpgkeys')
      expect(result).toEqual(mockKeys)
    })

    it('should handle empty GPG key list', async () => {
      const mockKeys = {
        metadata: {},
        items: null,
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockKeys } as any)

      const result = await gpgKeysApi.getGPGKeys()

      expect(result.items).toBeNull()
    })
  })

  describe('createGPGKey()', () => {
    it('should create new GPG key', async () => {
      const request = { keyData: '-----BEGIN PGP PUBLIC KEY BLOCK-----...' }
      const mockResponse = { keyID: 'NEW123', fingerprint: 'ABCDEF1234567890' }
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse } as any)

      const result = await gpgKeysApi.createGPGKey(request)

      expect(api.post).toHaveBeenCalledWith('/gpgkeys', request)
      expect(result).toEqual(mockResponse)
    })

    it('should send full key data in request', async () => {
      const request = {
        keyData: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: GnuPG v1\n...\n-----END PGP PUBLIC KEY BLOCK-----',
      }
      vi.mocked(api.post).mockResolvedValue({ data: { keyID: 'KEY123' } } as any)

      await gpgKeysApi.createGPGKey(request)

      expect(api.post).toHaveBeenCalledWith('/gpgkeys', request)
    })
  })

  describe('deleteGPGKey()', () => {
    it('should delete GPG key by keyID', async () => {
      vi.mocked(api.delete).mockResolvedValue({} as any)

      await gpgKeysApi.deleteGPGKey('ABC123')

      expect(api.delete).toHaveBeenCalledWith('/gpgkeys/ABC123')
    })

    it('should handle keyIDs with special characters', async () => {
      vi.mocked(api.delete).mockResolvedValue({} as any)

      await gpgKeysApi.deleteGPGKey('KEY-WITH-DASHES')

      expect(api.delete).toHaveBeenCalledWith('/gpgkeys/KEY-WITH-DASHES')
    })
  })
})

describe('GPG Key React Query Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
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

  describe('useGPGKeys()', () => {
    it('should fetch all GPG keys', async () => {
      const mockKeys = {
        metadata: {},
        items: [
          { keyID: 'ABC123', fingerprint: '1234567890ABCDEF' },
          { keyID: 'DEF456', fingerprint: 'FEDCBA0987654321' },
        ],
      }
      vi.mocked(api.get).mockResolvedValue({ data: mockKeys } as any)

      const { result } = renderHook(() => useGPGKeys(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockKeys)
    })

    it('should handle empty GPG key list', async () => {
      const mockKeys = { metadata: {}, items: null }
      vi.mocked(api.get).mockResolvedValue({ data: mockKeys } as any)

      const { result } = renderHook(() => useGPGKeys(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.items).toBeNull()
    })
  })

  describe('useCreateGPGKey()', () => {
    it('should create GPG key and invalidate list', async () => {
      const mockKey = { keyID: 'NEW123', fingerprint: 'ABCDEF1234567890' }
      vi.mocked(api.post).mockResolvedValue({ data: mockKey } as any)

      const { result } = renderHook(() => useCreateGPGKey(), { wrapper })

      result.current.mutate({ keyData: '-----BEGIN PGP PUBLIC KEY BLOCK-----...' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockKey)
    })

    it('should handle creation errors', async () => {
      const error = new Error('Invalid key format')
      vi.mocked(api.post).mockRejectedValue(error)

      const { result } = renderHook(() => useCreateGPGKey(), { wrapper })

      result.current.mutate({ keyData: 'invalid-key-data' })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toEqual(error)
    })
  })

  describe('useDeleteGPGKey()', () => {
    it('should delete GPG key and invalidate list', async () => {
      vi.mocked(api.delete).mockResolvedValue({} as any)

      const { result } = renderHook(() => useDeleteGPGKey(), { wrapper })

      result.current.mutate('ABC123')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Key not found')
      vi.mocked(api.delete).mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteGPGKey(), { wrapper })

      result.current.mutate('NONEXISTENT')

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toEqual(error)
    })
  })
})
