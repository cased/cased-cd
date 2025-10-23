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
    // Access via ArgoCD's Kubernetes API proxy
    const response = await api.get<NotificationsConfigMap>(
      '/api/v1/clusters/in-cluster/api/v1/namespaces/argocd/configmaps/argocd-notifications-cm'
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
    // First, get the current ConfigMap to preserve metadata
    const currentResponse = await api.get<NotificationsConfigMap>(
      '/api/v1/clusters/in-cluster/api/v1/namespaces/argocd/configmaps/argocd-notifications-cm'
    )

    const configMap = currentResponse.data

    // Rebuild data object from structured config
    const data: Record<string, string> = {}

    config.services.forEach((service) => {
      data[`service.${service.name}`] = service.config
    })

    config.templates.forEach((template) => {
      data[`template.${template.name}`] = template.config
    })

    config.triggers.forEach((trigger) => {
      data[`trigger.${trigger.name}`] = trigger.config
    })

    // Update ConfigMap
    await api.put(
      '/api/v1/clusters/in-cluster/api/v1/namespaces/argocd/configmaps/argocd-notifications-cm',
      {
        ...configMap,
        data,
      }
    )
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
