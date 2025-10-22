import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'

// Types
export interface Account {
  name: string
  enabled: boolean
  capabilities: string[]
  tokens?: {
    id: string
    issuedAt: number
    expiresAt: number
  }[]
}

export interface AccountList {
  items: Account[]
}

export interface AccountPassword {
  newPassword: string
  currentPassword?: string
}

// API endpoints
const ENDPOINTS = {
  accounts: '/account',
  account: (name: string) => `/account/${name}`,
  password: '/account/password', // Password endpoint doesn't take account name
  token: (name: string) => `/account/${name}/token`,
}

// Query Keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  detail: (name: string) => [...accountKeys.all, 'detail', name] as const,
}

// API Functions
export const accountsApi = {
  // Get all accounts
  getAccounts: async (): Promise<AccountList> => {
    const response = await api.get<AccountList>(ENDPOINTS.accounts)
    return response.data
  },

  // Get single account
  getAccount: async (name: string): Promise<Account> => {
    const response = await api.get<Account>(ENDPOINTS.account(name))
    return response.data
  },

  // Update account password (uses current logged-in user)
  updatePassword: async (passwords: AccountPassword): Promise<void> => {
    await api.put(ENDPOINTS.password, passwords)
  },

  // Create account token
  createToken: async (name: string, expiresIn?: number): Promise<{ token: string }> => {
    const response = await api.post<{ token: string }>(ENDPOINTS.token(name), { expiresIn })
    return response.data
  },

  // Delete account token
  deleteToken: async (name: string, tokenId: string): Promise<void> => {
    await api.delete(`${ENDPOINTS.token(name)}/${tokenId}`)
  },
}

// React Query Hooks

// Get all accounts
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.lists(),
    queryFn: () => accountsApi.getAccounts(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get single account
export function useAccount(name: string, enabled: boolean = true) {
  return useQuery({
    queryKey: accountKeys.detail(name),
    queryFn: () => accountsApi.getAccount(name),
    enabled: enabled && !!name,
    staleTime: 30 * 1000,
  })
}

// Update password mutation
export function useUpdatePassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (passwords: AccountPassword) =>
      accountsApi.updatePassword(passwords),
    onSuccess: () => {
      // Invalidate all account queries since we don't know which account was updated
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
    },
  })
}

// Create token mutation
export function useCreateToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, expiresIn }: { name: string; expiresIn?: number }) =>
      accountsApi.createToken(name, expiresIn),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.name) })
    },
  })
}

// Delete token mutation
export function useDeleteToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, tokenId }: { name: string; tokenId: string }) =>
      accountsApi.deleteToken(name, tokenId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.name) })
    },
  })
}
