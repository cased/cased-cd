import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type { Account, AccountList, CanIResponse, RBACConfig } from '@/types/api'

// Types
export interface AccountPassword {
  newPassword: string
  currentPassword?: string
}

export interface CreateAccountRequest {
  name: string
  password: string
  enabled?: boolean
}

export interface CreateAccountResponse {
  name: string
  message: string
}

// API endpoints
const ENDPOINTS = {
  accounts: '/account',
  account: (name: string) => `/account/${name}`,
  createAccount: '/settings/accounts', // Custom endpoint to create accounts
  password: '/account/password', // Password endpoint doesn't take account name
  token: (name: string) => `/account/${name}/token`,
  canI: (resource: string, action: string, subresource?: string) =>
    `/account/can-i/${resource}/${action}${subresource ? `/${subresource}` : ''}`,
  rbacConfig: '/settings/rbac', // RBAC configuration from argocd-rbac-cm
}

// Query Keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  detail: (name: string) => [...accountKeys.all, 'detail', name] as const,
  canI: (resource: string, action: string, subresource?: string) =>
    [...accountKeys.all, 'can-i', resource, action, subresource] as const,
  rbac: () => [...accountKeys.all, 'rbac'] as const,
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

  // Create account (custom Cased endpoint)
  createAccount: async (request: CreateAccountRequest): Promise<CreateAccountResponse> => {
    const response = await api.post<CreateAccountResponse>(ENDPOINTS.createAccount, {
      ...request,
      enabled: request.enabled ?? true,
    })
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

  // Check if current user can perform action
  canI: async (resource: string, action: string, subresource?: string): Promise<CanIResponse> => {
    const response = await api.get<CanIResponse>(ENDPOINTS.canI(resource, action, subresource))
    return response.data
  },

  // Get RBAC configuration (policies from argocd-rbac-cm)
  getRBACConfig: async (): Promise<RBACConfig> => {
    const response = await api.get<RBACConfig>(ENDPOINTS.rbacConfig)
    return response.data
  },

  // Update RBAC configuration (update argocd-rbac-cm)
  updateRBACConfig: async (config: RBACConfig): Promise<RBACConfig> => {
    const response = await api.put<RBACConfig>(ENDPOINTS.rbacConfig, config)
    return response.data
  },

  // Delete account (custom Cased endpoint)
  deleteAccount: async (name: string): Promise<{ name: string; message: string }> => {
    const response = await api.delete<{ name: string; message: string }>(
      `${ENDPOINTS.createAccount}?name=${name}`
    )
    return response.data
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

// Create account mutation
export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateAccountRequest) =>
      accountsApi.createAccount(request),
    onSuccess: () => {
      // Invalidate account list to show new account
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() })
    },
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
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() })
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
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() })
    },
  })
}

// Check permission for current user
export function useCanI(resource: string, action: string, subresource?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: accountKeys.canI(resource, action, subresource),
    queryFn: () => accountsApi.canI(resource, action, subresource),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  })
}

// Get RBAC configuration
export function useRBACConfig() {
  return useQuery({
    queryKey: accountKeys.rbac(),
    queryFn: () => accountsApi.getRBACConfig(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Update RBAC configuration mutation
export function useUpdateRBACConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: RBACConfig) => accountsApi.updateRBACConfig(config),
    onSuccess: () => {
      // Invalidate RBAC queries to refresh the data
      queryClient.invalidateQueries({ queryKey: accountKeys.rbac() })
    },
  })
}

// Delete account mutation
export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => accountsApi.deleteAccount(name),
    onSuccess: () => {
      // Invalidate account list to refresh accounts
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() })
    },
  })
}
