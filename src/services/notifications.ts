import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type {
  NotificationsConfig,
  NotificationsConfigMap,
  NotificationService,
  NotificationTemplate,
  NotificationTrigger,
} from '@/types/notifications'

// Query keys factory
export const notificationKeys = {
  all: ['notifications'] as const,
  config: () => [...notificationKeys.all, 'config'] as const,
}

// API functions
const notificationsApi = {
  // Get the notifications ConfigMap
  getNotificationsConfig: async (): Promise<NotificationsConfig> => {
    // For now, use a custom endpoint that wraps kubectl
    // In the future, this could use ArgoCD's settings API or a custom backend endpoint
    const response = await api.get<NotificationsConfigMap>(
      '/notifications/config'
    )

    const configMap = response.data
    const services: NotificationService[] = []
    const templates: NotificationTemplate[] = []
    const triggers: NotificationTrigger[] = []

    // Parse ConfigMap data into structured format
    Object.entries(configMap.data || {}).forEach(([key, value]) => {
      if (key.startsWith('service.')) {
        const serviceName = key.replace('service.', '')
        const serviceType = determineServiceType(serviceName, value)
        services.push({
          name: serviceName,
          type: serviceType,
          config: value,
        })
      } else if (key.startsWith('template.')) {
        const templateName = key.replace('template.', '')
        templates.push({
          name: templateName,
          config: value,
        })
      } else if (key.startsWith('trigger.')) {
        const triggerName = key.replace('trigger.', '')
        triggers.push({
          name: triggerName,
          config: value,
        })
      }
    })

    return { services, templates, triggers }
  },

  // Update the notifications ConfigMap
  updateNotificationsConfig: async (config: NotificationsConfig): Promise<void> => {
    // Use custom endpoint that wraps kubectl
    await api.put('/api/v1/notifications/config', config)
  },

  // Create a Slack notification service
  createSlackService: async (data: {
    name: string
    webhookUrl: string
    channel?: string
    username?: string
    icon?: string
  }): Promise<{ status: string; name: string }> => {
    const response = await api.post<{ status: string; name: string }>('/notifications/services', data)
    return response.data
  },

  // Test a Slack notification service
  testSlackService: async (data: {
    name?: string
    webhookUrl: string
    channel?: string
    username?: string
    icon?: string
  }): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>(`/notifications/services/${data.name || 'test'}/test`, data)
    return response.data
  },

  // Delete a notification service
  deleteNotificationService: async (name: string): Promise<{ status: string; name: string }> => {
    const response = await api.delete<{ status: string; name: string }>(`/notifications/services/${name}`)
    return response.data
  },

  // Create a GitHub notification service
  createGitHubService: async (data: {
    name: string
    installationId: string
    repositories?: string
  }): Promise<{ status: string; name: string }> => {
    const response = await api.post<{ status: string; name: string }>('/notifications/services/github', data)
    return response.data
  },

  // Test a GitHub notification service
  testGitHubService: async (data: {
    name?: string
    installationId: string
    repositories?: string
  }): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>(`/notifications/services/${data.name || 'test'}/test/github`, data)
    return response.data
  },
}

// Helper to determine service type from name and config
function determineServiceType(
  name: string,
  config: string
): NotificationService['type'] {
  const lowerName = name.toLowerCase()
  const lowerConfig = config.toLowerCase()

  if (lowerName.includes('slack') || lowerConfig.includes('slack')) return 'slack'
  if (lowerName.includes('email') || lowerConfig.includes('email')) return 'email'
  if (lowerName.includes('webhook') || lowerConfig.includes('url:')) return 'webhook'
  if (lowerName.includes('teams') || lowerConfig.includes('teams')) return 'teams'
  if (lowerName.includes('pagerduty') || lowerConfig.includes('pagerduty'))
    return 'pagerduty'
  if (lowerName.includes('github') || lowerConfig.includes('github')) return 'github'

  return 'other'
}

// React Query hooks
export function useNotificationsConfig() {
  return useQuery({
    queryKey: notificationKeys.config(),
    queryFn: () => notificationsApi.getNotificationsConfig(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useUpdateNotificationsConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: NotificationsConfig) =>
      notificationsApi.updateNotificationsConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useCreateSlackService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      webhookUrl: string
      channel?: string
      username?: string
      icon?: string
    }) => notificationsApi.createSlackService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useTestSlackService() {
  return useMutation({
    mutationFn: (data: {
      name?: string
      webhookUrl: string
      channel?: string
      username?: string
      icon?: string
    }) => notificationsApi.testSlackService(data),
  })
}

export function useDeleteNotificationService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => notificationsApi.deleteNotificationService(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useCreateGitHubService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      installationId: string
      repositories?: string
    }) => notificationsApi.createGitHubService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useTestGitHubService() {
  return useMutation({
    mutationFn: (data: {
      name?: string
      installationId: string
      repositories?: string
    }) => notificationsApi.testGitHubService(data),
  })
}
