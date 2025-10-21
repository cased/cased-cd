import { describe, it, expect } from 'vitest'
import { applicationSchema } from './application'

describe('Application Schema Validation', () => {
  describe('Valid inputs', () => {
    it('should accept valid application with minimal fields', () => {
      const validData = {
        name: 'my-app',
        project: 'default',
        repoURL: 'https://github.com/argoproj/argocd-example-apps',
        targetRevision: 'HEAD',
        destinationServer: 'https://kubernetes.default.svc',
        destinationNamespace: 'default',
        createNamespace: false,
        prune: false,
        selfHeal: false,
      }

      const result = applicationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept application with all fields', () => {
      const validData = {
        name: 'guestbook',
        project: 'production',
        repoURL: 'https://github.com/argoproj/argocd-example-apps',
        path: 'guestbook',
        targetRevision: 'v1.0.0',
        destinationServer: 'https://kubernetes.default.svc',
        destinationNamespace: 'production',
        createNamespace: true,
        prune: true,
        selfHeal: true,
      }

      const result = applicationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept application with auto-sync enabled', () => {
      const validData = {
        name: 'auto-sync-app',
        project: 'default',
        repoURL: 'https://github.com/org/repo',
        targetRevision: 'main',
        destinationServer: 'https://kubernetes.default.svc',
        destinationNamespace: 'default',
        createNamespace: false,
        prune: true,
        selfHeal: true,
      }

      const result = applicationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Required fields', () => {
    const validBase = {
      name: 'my-app',
      project: 'default',
      repoURL: 'https://github.com/org/repo',
      targetRevision: 'HEAD',
      destinationServer: 'https://kubernetes.default.svc',
      destinationNamespace: 'default',
      createNamespace: false,
      prune: false,
      selfHeal: false,
    }

    it('should fail when name is empty', () => {
      const invalidData = { ...validBase, name: '' }
      const result = applicationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Application name is required')
      }
    })

    it('should fail when project is empty', () => {
      const invalidData = { ...validBase, project: '' }
      const result = applicationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Project is required')
      }
    })

    it('should fail when repoURL is empty', () => {
      const invalidData = { ...validBase, repoURL: '' }
      const result = applicationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Repository URL is required')
      }
    })

    it('should fail when targetRevision is empty', () => {
      const invalidData = { ...validBase, targetRevision: '' }
      const result = applicationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Target revision is required')
      }
    })

    it('should fail when destinationServer is empty', () => {
      const invalidData = { ...validBase, destinationServer: '' }
      const result = applicationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Cluster URL is required')
      }
    })

    it('should fail when destinationNamespace is empty', () => {
      const invalidData = { ...validBase, destinationNamespace: '' }
      const result = applicationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Namespace is required')
      }
    })
  })

  describe('Optional fields', () => {
    it('should accept missing path', () => {
      const validData = {
        name: 'my-app',
        project: 'default',
        repoURL: 'https://github.com/org/repo',
        targetRevision: 'HEAD',
        destinationServer: 'https://kubernetes.default.svc',
        destinationNamespace: 'default',
        createNamespace: false,
        prune: false,
        selfHeal: false,
      }

      const result = applicationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty path', () => {
      const validData = {
        name: 'my-app',
        project: 'default',
        repoURL: 'https://github.com/org/repo',
        path: '',
        targetRevision: 'HEAD',
        destinationServer: 'https://kubernetes.default.svc',
        destinationNamespace: 'default',
        createNamespace: false,
        prune: false,
        selfHeal: false,
      }

      const result = applicationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Boolean fields', () => {
    it('should accept all boolean combinations', () => {
      const combinations = [
        { createNamespace: false, prune: false, selfHeal: false },
        { createNamespace: true, prune: false, selfHeal: false },
        { createNamespace: false, prune: true, selfHeal: false },
        { createNamespace: false, prune: false, selfHeal: true },
        { createNamespace: true, prune: true, selfHeal: true },
      ]

      combinations.forEach(bools => {
        const validData = {
          name: 'my-app',
          project: 'default',
          repoURL: 'https://github.com/org/repo',
          targetRevision: 'HEAD',
          destinationServer: 'https://kubernetes.default.svc',
          destinationNamespace: 'default',
          ...bools,
        }

        expect(applicationSchema.safeParse(validData).success).toBe(true)
      })
    })
  })

  describe('Edge cases', () => {
    it('should accept various target revisions', () => {
      const revisions = ['HEAD', 'main', 'v1.0.0', 'abc123', 'feature/my-branch']

      revisions.forEach(targetRevision => {
        const validData = {
          name: 'my-app',
          project: 'default',
          repoURL: 'https://github.com/org/repo',
          targetRevision,
          destinationServer: 'https://kubernetes.default.svc',
          destinationNamespace: 'default',
          createNamespace: false,
          prune: false,
          selfHeal: false,
        }

        expect(applicationSchema.safeParse(validData).success).toBe(true)
      })
    })

    it('should accept various repository URLs', () => {
      const urls = [
        'https://github.com/argoproj/argocd-example-apps',
        'https://gitlab.com/my-group/my-project',
        'git@github.com:argoproj/argo-cd.git',
        'https://charts.example.com',
        'oci://registry.example.com/charts',
      ]

      urls.forEach(repoURL => {
        const validData = {
          name: 'my-app',
          project: 'default',
          repoURL,
          targetRevision: 'HEAD',
          destinationServer: 'https://kubernetes.default.svc',
          destinationNamespace: 'default',
          createNamespace: false,
          prune: false,
          selfHeal: false,
        }

        expect(applicationSchema.safeParse(validData).success).toBe(true)
      })
    })

    it('should accept paths with slashes', () => {
      const validData = {
        name: 'my-app',
        project: 'default',
        repoURL: 'https://github.com/org/repo',
        path: 'manifests/production/app',
        targetRevision: 'HEAD',
        destinationServer: 'https://kubernetes.default.svc',
        destinationNamespace: 'default',
        createNamespace: false,
        prune: false,
        selfHeal: false,
      }

      const result = applicationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
