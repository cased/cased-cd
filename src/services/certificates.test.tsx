/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  certificateKeys,
  certificatesApi,
  useCertificates,
  useCreateCertificate,
  useDeleteCertificate,
  type Certificate,
  type CertificateList,
  type CreateCertificateRequest,
} from './certificates'
import api from '@/lib/api-client'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Certificates Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Keys', () => {
    it('should generate correct query keys structure', () => {
      expect(certificateKeys.all).toEqual(['certificates'])
      expect(certificateKeys.lists()).toEqual(['certificates', 'list'])
    })

    it('should have all array for base key', () => {
      expect(Array.isArray(certificateKeys.all)).toBe(true)
      expect(certificateKeys.all.length).toBe(1)
    })

    it('should have lists function that extends all key', () => {
      const lists = certificateKeys.lists()
      expect(lists[0]).toBe('certificates')
      expect(lists[1]).toBe('list')
    })
  })

  describe('API Functions', () => {
    const mockCertificate: Certificate = {
      serverName: 'github.com',
      certType: 'https',
      certSubType: 'cert',
      certData: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      certInfo: 'GitHub certificate',
    }

    const mockCertificateList: CertificateList = {
      items: [mockCertificate],
      metadata: {},
    }

    describe('getCertificates()', () => {
      it('should fetch all certificates', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: mockCertificateList } as any)

        const result = await certificatesApi.getCertificates()

        expect(api.get).toHaveBeenCalledWith('/certificates')
        expect(result).toEqual(mockCertificateList)
      })

      it('should handle empty certificate list', async () => {
        const emptyList: CertificateList = { items: [], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: emptyList } as any)

        const result = await certificatesApi.getCertificates()

        expect(result.items).toHaveLength(0)
      })

      it('should return metadata with items', async () => {
        const listWithMetadata: CertificateList = {
          items: [mockCertificate],
          metadata: { totalCount: 1 },
        }
        vi.mocked(api.get).mockResolvedValue({ data: listWithMetadata } as any)

        const result = await certificatesApi.getCertificates()

        expect(result.metadata).toEqual({ totalCount: 1 })
      })
    })

    describe('createCertificate()', () => {
      it('should create an HTTPS certificate', async () => {
        const request: CreateCertificateRequest = {
          serverName: 'github.com',
          certType: 'https',
          certData: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
          certInfo: 'GitHub certificate',
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockCertificate } as any)

        const result = await certificatesApi.createCertificate(request)

        expect(api.post).toHaveBeenCalledWith('/certificates', request)
        expect(result).toEqual(mockCertificate)
      })

      it('should create an SSH certificate', async () => {
        const sshRequest: CreateCertificateRequest = {
          serverName: 'gitlab.com',
          certType: 'ssh',
          certData: 'ssh-rsa AAAAB3...',
        }

        const sshCert: Certificate = {
          ...mockCertificate,
          serverName: 'gitlab.com',
          certType: 'ssh',
          certData: 'ssh-rsa AAAAB3...',
        }

        vi.mocked(api.post).mockResolvedValue({ data: sshCert } as any)

        const result = await certificatesApi.createCertificate(sshRequest)

        expect(api.post).toHaveBeenCalledWith('/certificates', sshRequest)
        expect(result.certType).toBe('ssh')
      })

      it('should create certificate without certInfo', async () => {
        const request: CreateCertificateRequest = {
          serverName: 'example.com',
          certType: 'https',
          certData: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockCertificate } as any)

        await certificatesApi.createCertificate(request)

        const callArgs = vi.mocked(api.post).mock.calls[0]
        expect(callArgs[1]).toEqual(request)
        expect(callArgs[1]).not.toHaveProperty('certInfo')
      })

      it('should send complete request with all fields', async () => {
        const request: CreateCertificateRequest = {
          serverName: 'test.example.com',
          certType: 'https',
          certData: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
          certInfo: 'Test certificate for example.com',
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockCertificate } as any)

        await certificatesApi.createCertificate(request)

        expect(api.post).toHaveBeenCalledWith('/certificates', request)
      })
    })

    describe('deleteCertificate()', () => {
      it('should delete a certificate with all parameters', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await certificatesApi.deleteCertificate('github.com', 'https', 'cert')

        expect(api.delete).toHaveBeenCalledWith('/certificates/github.com/https/cert')
      })

      it('should URL-encode server name in delete request', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await certificatesApi.deleteCertificate('my-server.example.com', 'https', 'cert')

        expect(api.delete).toHaveBeenCalledWith('/certificates/my-server.example.com/https/cert')
      })

      it('should handle special characters in server name', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await certificatesApi.deleteCertificate('server:8443', 'https', 'cert')

        expect(api.delete).toHaveBeenCalledWith('/certificates/server%3A8443/https/cert')
      })

      it('should delete SSH certificate', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await certificatesApi.deleteCertificate('gitlab.com', 'ssh', 'cert')

        expect(api.delete).toHaveBeenCalledWith('/certificates/gitlab.com/ssh/cert')
      })

      it('should handle different certSubType values', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        await certificatesApi.deleteCertificate('example.com', 'https', 'key')

        expect(api.delete).toHaveBeenCalledWith('/certificates/example.com/https/key')
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

    const mockCertificate: Certificate = {
      serverName: 'github.com',
      certType: 'https',
      certSubType: 'cert',
      certData: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      certInfo: 'GitHub certificate',
    }

    describe('useCertificates()', () => {
      it('should fetch certificates', async () => {
        const mockData: CertificateList = { items: [mockCertificate], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useCertificates(), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(api.get).toHaveBeenCalledWith('/certificates')
      })

      it('should handle empty certificates list', async () => {
        const emptyData: CertificateList = { items: [], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: emptyData } as any)

        const { result } = renderHook(() => useCertificates(), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data?.items).toHaveLength(0)
      })

      it('should use correct staleTime (30 seconds)', async () => {
        const mockData: CertificateList = { items: [mockCertificate], metadata: {} }
        vi.mocked(api.get).mockResolvedValue({ data: mockData } as any)

        const { result } = renderHook(() => useCertificates(), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.isStale).toBe(false)
      })
    })

    describe('useCreateCertificate()', () => {
      it('should create certificate and invalidate queries', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: mockCertificate } as any)

        const { result } = renderHook(() => useCreateCertificate(), { wrapper })

        const request: CreateCertificateRequest = {
          serverName: 'github.com',
          certType: 'https',
          certData: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
        }

        result.current.mutate(request)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.post).toHaveBeenCalledWith('/certificates', request)
        expect(result.current.data).toEqual(mockCertificate)
      })

      it('should create SSH certificate', async () => {
        const sshCert: Certificate = {
          ...mockCertificate,
          certType: 'ssh',
        }
        vi.mocked(api.post).mockResolvedValue({ data: sshCert } as any)

        const { result } = renderHook(() => useCreateCertificate(), { wrapper })

        const request: CreateCertificateRequest = {
          serverName: 'gitlab.com',
          certType: 'ssh',
          certData: 'ssh-rsa AAAAB3...',
        }

        result.current.mutate(request)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data?.certType).toBe('ssh')
      })
    })

    describe('useDeleteCertificate()', () => {
      it('should delete certificate and invalidate queries', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        const { result } = renderHook(() => useDeleteCertificate(), { wrapper })

        result.current.mutate({
          serverName: 'github.com',
          certType: 'https',
          certSubType: 'cert',
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.delete).toHaveBeenCalledWith('/certificates/github.com/https/cert')
      })

      it('should delete SSH certificate', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        const { result } = renderHook(() => useDeleteCertificate(), { wrapper })

        result.current.mutate({
          serverName: 'gitlab.com',
          certType: 'ssh',
          certSubType: 'cert',
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.delete).toHaveBeenCalledWith('/certificates/gitlab.com/ssh/cert')
      })

      it('should URL-encode special characters in server name', async () => {
        vi.mocked(api.delete).mockResolvedValue({} as any)

        const { result } = renderHook(() => useDeleteCertificate(), { wrapper })

        result.current.mutate({
          serverName: 'server:8443',
          certType: 'https',
          certSubType: 'cert',
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(api.delete).toHaveBeenCalledWith('/certificates/server%3A8443/https/cert')
      })
    })
  })
})
