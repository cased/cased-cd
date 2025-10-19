import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api-client'
import type {
  NotificationServicesResponse,
  NotificationTriggersResponse,
  NotificationTemplatesResponse,
  NotificationSubscription,
  Application,
} from '@/types/api'

/**
 * Query keys factory for notifications
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  services: () => [...notificationKeys.all, 'services'] as const,
  triggers: () => [...notificationKeys.all, 'triggers'] as const,
  templates: () => [...notificationKeys.all, 'templates'] as const,
}

/**
 * Notifications API functions
 */
export const notificationsApi = {
  /**
   * Get list of configured notification services (Slack, Email, etc.)
   */
  getServices: async (): Promise<NotificationServicesResponse> => {
    const response = await api.get<NotificationServicesResponse>('/notifications/services')
    return response.data
  },

  /**
   * Get list of configured triggers (on-sync-succeeded, on-health-degraded, etc.)
   */
  getTriggers: async (): Promise<NotificationTriggersResponse> => {
    const response = await api.get<NotificationTriggersResponse>('/notifications/triggers')
    return response.data
  },

  /**
   * Get list of configured notification templates
   */
  getTemplates: async (): Promise<NotificationTemplatesResponse> => {
    const response = await api.get<NotificationTemplatesResponse>('/notifications/templates')
    return response.data
  },
}

/**
 * React Query hooks
 */

/**
 * Hook to fetch notification services
 */
export function useNotificationServices() {
  return useQuery({
    queryKey: notificationKeys.services(),
    queryFn: () => notificationsApi.getServices(),
    staleTime: 5 * 60 * 1000, // 5 minutes - rarely changes
  })
}

/**
 * Hook to fetch notification triggers
 */
export function useNotificationTriggers() {
  return useQuery({
    queryKey: notificationKeys.triggers(),
    queryFn: () => notificationsApi.getTriggers(),
    staleTime: 5 * 60 * 1000, // 5 minutes - rarely changes
  })
}

/**
 * Hook to fetch notification templates
 */
export function useNotificationTemplates() {
  return useQuery({
    queryKey: notificationKeys.templates(),
    queryFn: () => notificationsApi.getTemplates(),
    staleTime: 5 * 60 * 1000, // 5 minutes - rarely changes
  })
}

/**
 * Utility functions for managing subscriptions in Application annotations
 */

const NOTIFICATION_ANNOTATION_PREFIX = 'notifications.argoproj.io/subscribe'

/**
 * Parse notification subscriptions from Application annotations
 * Annotations format: notifications.argoproj.io/subscribe.<trigger>.<service>: <recipients>
 */
export function parseNotificationSubscriptions(
  app: Application
): NotificationSubscription[] {
  const annotations = app.metadata.annotations || {}
  const subscriptions: NotificationSubscription[] = []

  Object.entries(annotations).forEach(([key, value]) => {
    if (key.startsWith(NOTIFICATION_ANNOTATION_PREFIX)) {
      // Extract trigger and service from key
      // Format: notifications.argoproj.io/subscribe.<trigger>.<service>
      const suffix = key.substring(NOTIFICATION_ANNOTATION_PREFIX.length + 1) // +1 for the dot
      const parts = suffix.split('.')

      if (parts.length >= 2) {
        const trigger = parts[0]
        const service = parts.slice(1).join('.') // In case service name has dots

        // Parse recipients (semicolon-separated)
        const recipients = value
          .split(';')
          .map((r) => r.trim())
          .filter((r) => r.length > 0)

        subscriptions.push({
          trigger,
          service,
          recipients,
        })
      }
    }
  })

  return subscriptions
}

/**
 * Convert notification subscriptions to Application annotations
 */
export function subscriptionsToAnnotations(
  subscriptions: NotificationSubscription[]
): Record<string, string> {
  const annotations: Record<string, string> = {}

  subscriptions.forEach((sub) => {
    const key = `${NOTIFICATION_ANNOTATION_PREFIX}.${sub.trigger}.${sub.service}`
    const value = sub.recipients.join(';')
    annotations[key] = value
  })

  return annotations
}

/**
 * Merge new subscriptions with existing annotations (preserving non-notification annotations)
 */
export function mergeSubscriptionsWithAnnotations(
  existingAnnotations: Record<string, string> | undefined,
  newSubscriptions: NotificationSubscription[]
): Record<string, string> {
  // Start with existing annotations
  const result = { ...existingAnnotations }

  // Remove all existing notification subscription annotations
  Object.keys(result).forEach((key) => {
    if (key.startsWith(NOTIFICATION_ANNOTATION_PREFIX)) {
      delete result[key]
    }
  })

  // Add new subscriptions
  const newAnnotations = subscriptionsToAnnotations(newSubscriptions)
  Object.assign(result, newAnnotations)

  return result
}
