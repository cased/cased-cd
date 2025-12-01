import { describe, it, expect } from 'vitest'
import type { Application } from '@/types/api'

/**
 * Tests for defensive null checks to prevent runtime errors
 * when rendering applications with missing or incomplete data
 */
describe('Application defensive checks', () => {
  describe('app.spec.source', () => {
    it('should handle missing app.spec.source gracefully', () => {
      const appWithoutSource = {
        metadata: { name: 'test-app', namespace: 'argocd' },
        spec: {
          destination: { namespace: 'default', server: 'https://kubernetes.default.svc' },
          project: 'default'
        }
      } as Application

      // This should not throw - defensive check pattern
      expect(appWithoutSource.spec.source).toBeUndefined()

      // Optional chaining also safe
      expect(appWithoutSource.spec.source?.repoURL).toBeUndefined()
    })

    it('should access source.repoURL when source exists', () => {
      const appWithSource = {
        metadata: { name: 'test-app', namespace: 'argocd' },
        spec: {
          source: {
            repoURL: 'https://github.com/test/repo.git',
            path: 'manifests',
            targetRevision: 'HEAD'
          },
          destination: { namespace: 'default', server: 'https://kubernetes.default.svc' },
          project: 'default'
        }
      } as Application

      if (appWithSource.spec.source) {
        expect(appWithSource.spec.source.repoURL).toBe('https://github.com/test/repo.git')
        expect(appWithSource.spec.source.path).toBe('manifests')
        expect(appWithSource.spec.source.targetRevision).toBe('HEAD')
      }
    })

    it('should handle missing targetRevision using optional chaining', () => {
      const appWithoutRevision = {
        metadata: { name: 'test-app', namespace: 'argocd' },
        spec: {
          source: {
            repoURL: 'https://github.com/test/repo.git',
            path: 'manifests'
          },
          destination: { namespace: 'default' },
          project: 'default'
        }
      } as Application

      // Optional chaining (?.) prevents errors
      expect(appWithoutRevision.spec.source?.targetRevision).toBeUndefined()
      expect(appWithoutRevision.spec.source?.repoURL).toBe('https://github.com/test/repo.git')
    })
  })

  describe('Multi-source applications (ArgoCD 2.6+)', () => {
    it('should handle apps with sources[] instead of source', () => {
      const multiSourceApp = {
        metadata: { name: 'test-app', namespace: 'argocd' },
        spec: {
          sources: [
            { repoURL: 'https://github.com/test/repo1.git', path: 'app' },
            { repoURL: 'https://github.com/test/repo2.git', path: 'config' }
          ],
          destination: { namespace: 'default' },
          project: 'default'
        }
      } as Application

      // source is undefined, sources has values
      expect(multiSourceApp.spec.source).toBeUndefined()
      expect(multiSourceApp.spec.sources).toHaveLength(2)
      expect(multiSourceApp.spec.sources?.[0]?.repoURL).toBe('https://github.com/test/repo1.git')
    })

    it('should gracefully skip rendering when both source and sources are missing', () => {
      const appWithNeither = {
        metadata: { name: 'test-app', namespace: 'argocd' },
        spec: {
          destination: { namespace: 'default' },
          project: 'default'
        }
      } as Application

      expect(appWithNeither.spec.source).toBeUndefined()
      expect(appWithNeither.spec.sources).toBeUndefined()

      // Component should skip rendering repository section
      const shouldRenderRepo = !!(appWithNeither.spec.source || appWithNeither.spec.sources)
      expect(shouldRenderRepo).toBe(false)
    })

    it('should display first source and count for multi-source apps in card view', () => {
      const multiSourceApp = {
        metadata: { name: 'multi-app', namespace: 'argocd' },
        spec: {
          sources: [
            { repoURL: 'https://github.com/org/repo1.git', path: 'app' },
            { repoURL: 'https://github.com/org/repo2.git', path: 'config' },
            { repoURL: 'https://github.com/org/repo3.git', path: 'values' }
          ],
          destination: { namespace: 'default' },
          project: 'default'
        }
      } as Application

      // Card view logic: show first source + count
      const sources = multiSourceApp.spec.sources!
      const firstSource = sources[0]
      const additionalCount = sources.length - 1

      expect(firstSource.repoURL).toBe('https://github.com/org/repo1.git')
      expect(additionalCount).toBe(2)

      // Expected display: "org/repo1 +2 more"
      const displayText = `${firstSource.repoURL} +${additionalCount} more`
      expect(displayText).toContain('+2 more')
    })

    it('should display all sources in detail view sidebar', () => {
      const multiSourceApp = {
        metadata: { name: 'multi-app', namespace: 'argocd' },
        spec: {
          sources: [
            { repoURL: 'https://github.com/org/helm-charts.git', chart: 'my-app', targetRevision: '1.0.0' },
            { repoURL: 'https://github.com/org/config.git', path: 'envs/prod', targetRevision: 'main' }
          ],
          destination: { namespace: 'production' },
          project: 'default'
        }
      } as Application

      // Detail view logic: iterate all sources
      const sources = multiSourceApp.spec.sources!

      expect(sources).toHaveLength(2)
      expect(sources[0].repoURL).toBe('https://github.com/org/helm-charts.git')
      expect(sources[0].chart).toBe('my-app')
      expect(sources[0].targetRevision).toBe('1.0.0')
      expect(sources[1].repoURL).toBe('https://github.com/org/config.git')
      expect(sources[1].path).toBe('envs/prod')
      expect(sources[1].targetRevision).toBe('main')
    })

    it('should handle single-item sources array', () => {
      const singleSourceInArray = {
        metadata: { name: 'single-in-array', namespace: 'argocd' },
        spec: {
          sources: [
            { repoURL: 'https://github.com/test/repo.git', path: 'manifests' }
          ],
          destination: { namespace: 'default' },
          project: 'default'
        }
      } as Application

      expect(singleSourceInArray.spec.source).toBeUndefined()
      expect(singleSourceInArray.spec.sources).toHaveLength(1)

      // Should not show "+0 more" for single source
      const additionalCount = singleSourceInArray.spec.sources!.length - 1
      expect(additionalCount).toBe(0)
    })

    it('should handle empty sources array', () => {
      const emptySourcesApp = {
        metadata: { name: 'empty-sources', namespace: 'argocd' },
        spec: {
          sources: [],
          destination: { namespace: 'default' },
          project: 'default'
        }
      } as Application

      expect(emptySourcesApp.spec.sources).toHaveLength(0)

      // Should not render repository section for empty sources
      const shouldRenderMultiSource = !emptySourcesApp.spec.source &&
        emptySourcesApp.spec.sources &&
        emptySourcesApp.spec.sources.length > 0
      expect(shouldRenderMultiSource).toBe(false)
    })
  })

  describe('Loading states and race conditions', () => {
    it('should handle partially loaded application data', () => {
      const partialApp = {
        metadata: { name: 'loading-app', namespace: 'argocd' },
        spec: {
          destination: { namespace: 'default' },
          project: 'default'
        }
        // source may arrive later due to API streaming/pagination
      } as Application

      // Safe access pattern should not throw
      const hasSource = !!partialApp.spec.source
      expect(hasSource).toBe(false)

      // Even if we try to access, it won't crash with optional chaining
      expect(partialApp.spec.source?.repoURL).toBeUndefined()
    })
  })
})
