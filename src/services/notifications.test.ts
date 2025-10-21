import { describe, it, expect } from 'vitest'
import {
  parseNotificationSubscriptions,
  subscriptionsToAnnotations,
  mergeSubscriptionsWithAnnotations,
} from './notifications'
import type { Application } from '@/types/api'

describe('Notification Services', () => {
  describe('parseNotificationSubscriptions', () => {
    it('should parse single subscription from annotations', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'my-channel',
          },
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      const result = parseNotificationSubscriptions(app)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        trigger: 'on-sync-succeeded',
        service: 'slack',
        recipients: ['my-channel'],
      })
    })

    it('should parse multiple recipients (semicolon-separated)', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-failed.email':
              'user1@example.com;user2@example.com',
          },
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      const result = parseNotificationSubscriptions(app)

      expect(result).toHaveLength(1)
      expect(result[0].recipients).toEqual(['user1@example.com', 'user2@example.com'])
    })

    it('should parse multiple subscriptions', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'channel1',
            'notifications.argoproj.io/subscribe.on-sync-failed.email': 'team@example.com',
            'notifications.argoproj.io/subscribe.on-health-degraded.pagerduty': 'service-key',
          },
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      const result = parseNotificationSubscriptions(app)

      expect(result).toHaveLength(3)
      expect(result.map((s) => s.trigger)).toContain('on-sync-succeeded')
      expect(result.map((s) => s.trigger)).toContain('on-sync-failed')
      expect(result.map((s) => s.trigger)).toContain('on-health-degraded')
    })

    it('should handle service names with dots', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-deployed.slack.custom-service': 'my-channel',
          },
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      const result = parseNotificationSubscriptions(app)

      expect(result).toHaveLength(1)
      expect(result[0].service).toBe('slack.custom-service')
    })

    it('should return empty array when no notification annotations', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'some-other-annotation': 'value',
          },
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      const result = parseNotificationSubscriptions(app)

      expect(result).toHaveLength(0)
    })

    it('should return empty array when no annotations at all', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      const result = parseNotificationSubscriptions(app)

      expect(result).toHaveLength(0)
    })

    it('should trim whitespace from recipients', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': ' channel1 ; channel2 ',
          },
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      const result = parseNotificationSubscriptions(app)

      expect(result[0].recipients).toEqual(['channel1', 'channel2'])
    })

    it('should filter out empty recipients', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'channel1;;channel2',
          },
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      const result = parseNotificationSubscriptions(app)

      expect(result[0].recipients).toEqual(['channel1', 'channel2'])
    })
  })

  describe('subscriptionsToAnnotations', () => {
    it('should convert single subscription to annotation', () => {
      const subscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['my-channel'],
        },
      ]

      const result = subscriptionsToAnnotations(subscriptions)

      expect(result).toEqual({
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'my-channel',
      })
    })

    it('should join multiple recipients with semicolons', () => {
      const subscriptions = [
        {
          trigger: 'on-sync-failed',
          service: 'email',
          recipients: ['user1@example.com', 'user2@example.com'],
        },
      ]

      const result = subscriptionsToAnnotations(subscriptions)

      expect(result).toEqual({
        'notifications.argoproj.io/subscribe.on-sync-failed.email':
          'user1@example.com;user2@example.com',
      })
    })

    it('should convert multiple subscriptions', () => {
      const subscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['channel1'],
        },
        {
          trigger: 'on-sync-failed',
          service: 'email',
          recipients: ['team@example.com'],
        },
      ]

      const result = subscriptionsToAnnotations(subscriptions)

      expect(result).toEqual({
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'channel1',
        'notifications.argoproj.io/subscribe.on-sync-failed.email': 'team@example.com',
      })
    })

    it('should return empty object for empty subscriptions', () => {
      const result = subscriptionsToAnnotations([])

      expect(result).toEqual({})
    })
  })

  describe('mergeSubscriptionsWithAnnotations', () => {
    it('should preserve non-notification annotations', () => {
      const existingAnnotations = {
        'some-other-annotation': 'value',
        'app.kubernetes.io/name': 'my-app',
      }

      const subscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['my-channel'],
        },
      ]

      const result = mergeSubscriptionsWithAnnotations(existingAnnotations, subscriptions)

      expect(result['some-other-annotation']).toBe('value')
      expect(result['app.kubernetes.io/name']).toBe('my-app')
      expect(result['notifications.argoproj.io/subscribe.on-sync-succeeded.slack']).toBe(
        'my-channel'
      )
    })

    it('should remove old notification annotations', () => {
      const existingAnnotations = {
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'old-channel',
        'notifications.argoproj.io/subscribe.on-sync-failed.email': 'old@example.com',
        'other-annotation': 'value',
      }

      const subscriptions = [
        {
          trigger: 'on-deployed',
          service: 'teams',
          recipients: ['new-team'],
        },
      ]

      const result = mergeSubscriptionsWithAnnotations(existingAnnotations, subscriptions)

      expect(result['notifications.argoproj.io/subscribe.on-sync-succeeded.slack']).toBeUndefined()
      expect(result['notifications.argoproj.io/subscribe.on-sync-failed.email']).toBeUndefined()
      expect(result['notifications.argoproj.io/subscribe.on-deployed.teams']).toBe('new-team')
      expect(result['other-annotation']).toBe('value')
    })

    it('should handle undefined existing annotations', () => {
      const subscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['my-channel'],
        },
      ]

      const result = mergeSubscriptionsWithAnnotations(undefined, subscriptions)

      expect(result).toEqual({
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'my-channel',
      })
    })

    it('should handle empty subscriptions array', () => {
      const existingAnnotations = {
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'channel',
        'other-annotation': 'value',
      }

      const result = mergeSubscriptionsWithAnnotations(existingAnnotations, [])

      expect(result['notifications.argoproj.io/subscribe.on-sync-succeeded.slack']).toBeUndefined()
      expect(result['other-annotation']).toBe('value')
    })

    it('should replace all notification subscriptions', () => {
      const existingAnnotations = {
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'old-channel',
        'notifications.argoproj.io/subscribe.on-sync-failed.email': 'old@example.com',
      }

      const subscriptions = [
        {
          trigger: 'on-sync-succeeded',
          service: 'slack',
          recipients: ['new-channel'],
        },
        {
          trigger: 'on-health-degraded',
          service: 'pagerduty',
          recipients: ['service-key'],
        },
      ]

      const result = mergeSubscriptionsWithAnnotations(existingAnnotations, subscriptions)

      expect(result).toEqual({
        'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'new-channel',
        'notifications.argoproj.io/subscribe.on-health-degraded.pagerduty': 'service-key',
      })
    })
  })

  describe('Round-trip conversion', () => {
    it('should maintain data through parse -> convert cycle', () => {
      const app: Application = {
        metadata: {
          name: 'test-app',
          namespace: 'argocd',
          annotations: {
            'notifications.argoproj.io/subscribe.on-sync-succeeded.slack': 'channel1;channel2',
            'notifications.argoproj.io/subscribe.on-sync-failed.email': 'team@example.com',
            'other-annotation': 'keep-me',
          },
        },
        spec: {
          source: { repoURL: 'https://github.com/test/repo', path: 'app' },
          destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
          project: 'default',
        },
      }

      // Parse annotations to subscriptions
      const subscriptions = parseNotificationSubscriptions(app)

      // Convert back to annotations
      const newAnnotations = subscriptionsToAnnotations(subscriptions)

      // Merge with existing annotations
      const mergedAnnotations = mergeSubscriptionsWithAnnotations(
        app.metadata.annotations,
        subscriptions
      )

      // Check that notification annotations are preserved
      expect(newAnnotations['notifications.argoproj.io/subscribe.on-sync-succeeded.slack']).toBe(
        'channel1;channel2'
      )
      expect(newAnnotations['notifications.argoproj.io/subscribe.on-sync-failed.email']).toBe(
        'team@example.com'
      )

      // Check that non-notification annotations are preserved in merge
      expect(mergedAnnotations['other-annotation']).toBe('keep-me')
    })
  })
})
