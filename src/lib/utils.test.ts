/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-constant-binary-expression */
import { describe, it, expect } from 'vitest'
import { cn, formatRepoUrl } from './utils'

describe('Utils', () => {
  describe('cn()', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar')
      expect(result).toBe('foo bar')
    })

    it('should handle conditional class names', () => {
      const result = cn('foo', false && 'bar', 'baz')
      expect(result).toBe('foo baz')
    })

    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4')
      // tailwind-merge should keep only the last px class
      expect(result).toBe('py-1 px-4')
    })

    it('should handle arrays of class names', () => {
      const result = cn(['foo', 'bar'], 'baz')
      expect(result).toBe('foo bar baz')
    })

    it('should handle objects with boolean values', () => {
      const result = cn({
        foo: true,
        bar: false,
        baz: true,
      })
      expect(result).toBe('foo baz')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle undefined and null', () => {
      const result = cn('foo', undefined, null, 'bar')
      expect(result).toBe('foo bar')
    })

    it('should merge conflicting Tailwind utilities', () => {
      const result = cn('text-red-500', 'text-blue-500')
      // Should keep only the last color
      expect(result).toBe('text-blue-500')
    })
  })

  describe('formatRepoUrl()', () => {
    describe('GitHub HTTPS URLs', () => {
      it('should parse standard GitHub HTTPS URL', () => {
        const result = formatRepoUrl('https://github.com/facebook/react')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'facebook/react',
          fullUrl: 'https://github.com/facebook/react',
        })
      })

      it('should parse GitHub HTTPS URL with .git extension', () => {
        const result = formatRepoUrl('https://github.com/facebook/react.git')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'facebook/react',
          fullUrl: 'https://github.com/facebook/react.git',
        })
      })

      it('should parse GitHub HTTPS URL without protocol', () => {
        const result = formatRepoUrl('github.com/facebook/react')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'facebook/react',
          fullUrl: 'github.com/facebook/react',
        })
      })

      it('should parse GitHub HTTPS URL with www', () => {
        const result = formatRepoUrl('https://www.github.com/facebook/react')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'facebook/react',
          fullUrl: 'https://www.github.com/facebook/react',
        })
      })

      it('should handle org names with hyphens', () => {
        const result = formatRepoUrl('https://github.com/my-org/my-repo')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'my-org/my-repo',
          fullUrl: 'https://github.com/my-org/my-repo',
        })
      })

      it('should handle repo names with underscores and numbers', () => {
        const result = formatRepoUrl('https://github.com/facebook/react_native_123')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'facebook/react_native_123',
          fullUrl: 'https://github.com/facebook/react_native_123',
        })
      })
    })

    describe('GitHub SSH URLs', () => {
      it('should parse standard GitHub SSH URL', () => {
        const result = formatRepoUrl('git@github.com:facebook/react')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'facebook/react',
          fullUrl: 'git@github.com:facebook/react',
        })
      })

      it('should parse GitHub SSH URL with .git extension', () => {
        const result = formatRepoUrl('git@github.com:facebook/react.git')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'facebook/react',
          fullUrl: 'git@github.com:facebook/react.git',
        })
      })

      it('should handle org names with hyphens in SSH URL', () => {
        const result = formatRepoUrl('git@github.com:my-org/my-repo')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'my-org/my-repo',
          fullUrl: 'git@github.com:my-org/my-repo',
        })
      })
    })

    describe('Non-GitHub URLs', () => {
      it('should return GitLab URL as-is', () => {
        const url = 'https://gitlab.com/group/project'
        const result = formatRepoUrl(url)
        expect(result).toEqual({
          isGithub: false,
          displayText: url,
          fullUrl: url,
        })
      })

      it('should return Bitbucket URL as-is', () => {
        const url = 'https://bitbucket.org/team/repo'
        const result = formatRepoUrl(url)
        expect(result).toEqual({
          isGithub: false,
          displayText: url,
          fullUrl: url,
        })
      })

      it('should return custom Git URL as-is', () => {
        const url = 'https://git.company.com/team/repo.git'
        const result = formatRepoUrl(url)
        expect(result).toEqual({
          isGithub: false,
          displayText: url,
          fullUrl: url,
        })
      })

      it('should return SSH URL for non-GitHub as-is', () => {
        const url = 'git@gitlab.com:group/project.git'
        const result = formatRepoUrl(url)
        expect(result).toEqual({
          isGithub: false,
          displayText: url,
          fullUrl: url,
        })
      })

      it('should handle plain HTTP URLs', () => {
        const url = 'http://example.com/repo'
        const result = formatRepoUrl(url)
        expect(result).toEqual({
          isGithub: false,
          displayText: url,
          fullUrl: url,
        })
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty string', () => {
        const result = formatRepoUrl('')
        expect(result).toEqual({
          isGithub: false,
          displayText: '',
          fullUrl: '',
        })
      })

      it('should handle malformed URL', () => {
        const url = 'not-a-valid-url'
        const result = formatRepoUrl(url)
        expect(result).toEqual({
          isGithub: false,
          displayText: url,
          fullUrl: url,
        })
      })

      it('should handle GitHub URL with extra path segments', () => {
        const url = 'https://github.com/facebook/react/tree/main'
        const result = formatRepoUrl(url)
        // Should not match because of extra path
        expect(result).toEqual({
          isGithub: false,
          displayText: url,
          fullUrl: url,
        })
      })

      it('should handle case-insensitive GitHub domain', () => {
        const result = formatRepoUrl('https://GitHub.com/facebook/react')
        expect(result).toEqual({
          isGithub: true,
          displayText: 'facebook/react',
          fullUrl: 'https://GitHub.com/facebook/react',
        })
      })

      it('should preserve original URL in fullUrl', () => {
        const original = 'https://github.com/facebook/react.git'
        const result = formatRepoUrl(original)
        expect(result.fullUrl).toBe(original)
      })
    })
  })
})
