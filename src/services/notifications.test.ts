import { describe, it, expect } from 'vitest'
import {
  parseNotificationSubscriptions,
  subscriptionsToAnnotations,
  mergeSubscriptionsWithAnnotations,
} from './notifications'
import type { Application } from '@/types/api'

describe('Notification Service', () => {
  describe('parseNotificationSubscriptions', () => {
    it('should parse simple notification subscriptions from annotations', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'my-channel',
            'notifications.argoproj.io/subscribe.on-sync-failed.email': 'team@example.com',
          },
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const subscriptions = parseNotificationSubscriptions(app)

      expect(subscriptions).toHaveLength(2)
      expect(subscriptions).toContainEqual({
        trigger: 'on-sync-succeeded',
        service: 'slack',
        recipients: ['my-channel'],
      })
      expect(subscriptions).toContainEqual({
        trigger: 'on-sync-failed',
        service: 'email',
        recipients: ['team@example.com'],
      })
    })

    it('should parse multiple recipients separated by semicolons', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-deployed.slack': 'channel1;channel2;channel3',
          },
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const subscriptions = parseNotificationSubscriptions(app)

      expect(subscriptions).toHaveLength(1)
      expect(subscriptions[0].recipients).toEqual(['channel1', 'channel2', 'channel3'])
    })

    it('should handle service names with dots', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-succeeded.slack.custom': 'my-channel',
          },
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const subscriptions = parseNotificationSubscriptions(app)

      expect(subscriptions).toHaveLength(1)
      expect(subscriptions[0].service).toBe('slack.custom')
    })

    it('should trim whitespace from recipients', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-failed.email': '  user1@example.com ; user2@example.com  ',
          },
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const subscriptions = parseNotificationSubscriptions(app)

      expect(subscriptions[0].recipients).toEqual(['user1@example.com', 'user2@example.com'])
    })

    it('should filter out empty recipients', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-deployed.slack': 'channel1;;channel2;',
          },
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const subscriptions = parseNotificationSubscriptions(app)

      expect(subscriptions[0].recipients).toEqual(['channel1', 'channel2'])
    })

    it('should return empty array when no notification annotations exist', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'other-annotation': 'value',
          },
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const subscriptions = parseNotificationSubscriptions(app)

      expect(subscriptions).toEqual([])
    })

    it('should return empty array when annotations is undefined', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const subscriptions = parseNotificationSubscriptions(app)

      expect(subscriptions).toEqual([])
    })

    it('should ignore malformed annotation keys', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe': 'invalid',
            'notifications.argoproj.io/subscribe.': 'invalid',
            'notifications.argoproj.io/subscribe.trigger-only': 'invalid',
            'notifications.argoproj.io/subscribe.valid-trigger.valid-service': 'valid-channel',
          },
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const subscriptions = parseNotificationSubscriptions(app)

      // Should only parse the valid one
      expect(subscriptions).toHaveLength(1)
      expect(subscriptions[0]).toEqual({
        trigger: 'valid-trigger',
        service: 'valid-service',
        recipients: ['valid-channel'],
      })
    })
  })

  describe('subscriptionsToAnnotations', () => {
    it('should convert subscriptions to annotation format', () => {
      const subscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['my-channel'],
        },
        {
          trigger: 'on-sync-failed',
          service: 'email',
          recipients: ['team@example.com'],
        },
      ]

      const annotations = subscriptionsToAnnotations(subscriptions)

      expect(annotations).toEqual({
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'my-channel',
        'notifications.argoproj.io/subscribe.on-sync-failed.email': 'team@example.com',
      })
    })

    it('should join multiple recipients with semicolons', () => {
      const subscriptions = [
        {
          trigger: 'on-deployed',
          service: 'slack',
          recipients: ['channel1', 'channel2', 'channel3'],
        },
      ]

      const annotations = subscriptionsToAnnotations(subscriptions)

      expect(annotations).toEqual({
        'notifications.argoproj.io/subscribe.on-deployed.slack': 'channel1;channel2;channel3',
      })
    })

    it('should handle empty subscriptions array', () => {
      const annotations = subscriptionsToAnnotations([])

      expect(annotations).toEqual({})
    })

    it('should handle service names with dots', () => {
      const subscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack.custom',
          recipients: ['my-channel'],
        },
      ]

      const annotations = subscriptionsToAnnotations(subscriptions)

      expect(annotations).toEqual({
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack.custom': 'my-channel',
      })
    })
  })

  describe('mergeSubscriptionsWithAnnotations', () => {
    it('should merge new subscriptions while preserving non-notification annotations', () => {
      const existingAnnotations = {
        'app.kubernetes.io/name': 'my-app',
        'app.kubernetes.io/version': '1.0.0',
        'notifications.argoproj.io/subscribe.old-trigger.slack': 'old-channel',
      }

      const newSubscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['new-channel'],
        },
      ]

      const result = mergeSubscriptionsWithAnnotations(existingAnnotations, newSubscriptions)

      expect(result).toEqual({
        'app.kubernetes.io/name': 'my-app',
        'app.kubernetes.io/version': '1.0.0',
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'new-channel',
      })
    })

    it('should remove all old notification subscriptions', () => {
      const existingAnnotations = {
        'notifications.argoproj.io/subscribe.trigger1.slack': 'channel1',
        'notifications.argoproj.io/subscribe.trigger2.email': 'user@example.com',
        'notifications.argoproj.io/subscribe.trigger3.teams': 'team-channel',
        'other-annotation': 'value',
      }

      const newSubscriptions = [
        {
          trigger: 'new-trigger',
          service: 'slack',
          recipients: ['new-channel'],
        },
      ]

      const result = mergeSubscriptionsWithAnnotations(existingAnnotations, newSubscriptions)

      expect(result).toEqual({
        'other-annotation': 'value',
        'notifications.argoproj.io/subscribe.new-trigger.slack': 'new-channel',
      })
    })

    it('should handle undefined existing annotations', () => {
      const newSubscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['my-channel'],
        },
      ]

      const result = mergeSubscriptionsWithAnnotations(undefined, newSubscriptions)

      expect(result).toEqual({
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'my-channel',
      })
    })

    it('should handle empty new subscriptions', () => {
      const existingAnnotations = {
        'app.kubernetes.io/name': 'my-app',
        'notifications.argoproj.io/subscribe.old-trigger.slack': 'old-channel',
      }

      const result = mergeSubscriptionsWithAnnotations(existingAnnotations, [])

      expect(result).toEqual({
        'app.kubernetes.io/name': 'my-app',
      })
    })

    it('should preserve all non-notification annotations', () => {
      const existingAnnotations = {
        'argocd.argoproj.io/sync-wave': '1',
        'argocd.argoproj.io/hook': 'PreSync',
        'kubectl.kubernetes.io/last-applied-configuration': '{}',
        'notifications.argoproj.io/subscribe.old.slack': 'old',
      }

      const newSubscriptions = [
        {
          trigger: 'new',
          service: 'email',
          recipients: ['user@example.com'],
        },
      ]

      const result = mergeSubscriptionsWithAnnotations(existingAnnotations, newSubscriptions)

      expect(result).toEqual({
        'argocd.argoproj.io/sync-wave': '1',
        'argocd.argoproj.io/hook': 'PreSync',
        'kubectl.kubernetes.io/last-applied-configuration': '{}',
        'notifications.argoproj.io/subscribe.new.email': 'user@example.com',
      })
    })
  })

  describe('Round-trip conversion', () => {
    it('should preserve data through parse and convert cycle', () => {
      const originalSubscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['channel1', 'channel2'],
        },
        {
          trigger: 'on-health-degraded',
          service: 'email',
          recipients: ['team@example.com'],
        },
      ]

      const annotations = subscriptionsToAnnotations(originalSubscriptions)

      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations,
        },
        spec: {
          project: 'default',
          source: { repoURL: 'https://example.com/repo' },
          destination: { server: 'https://kubernetes.default.svc' },
        },
      }

      const parsedSubscriptions = parseNotificationSubscriptions(app)

      expect(parsedSubscriptions).toHaveLength(originalSubscriptions.length)
      expect(parsedSubscriptions).toEqual(expect.arrayContaining(originalSubscriptions))
    })
  })
})
