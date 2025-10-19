import { describe, it, expect } from 'vitest'
import { repositorySchema } from './repository'

describe('Repository Schema Validation', () => {
  describe('Valid inputs', () => {
    it('should accept valid Git repository', () => {
      const validData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept valid Helm repository with name', () => {
      const validData = {
        type: 'helm' as const,
        name: 'my-helm-repo',
        repo: 'https://charts.example.com',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept valid OCI repository', () => {
      const validData = {
        type: 'oci' as const,
        repo: 'oci://registry.example.com/charts',
        insecure: true,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept repository with auth credentials', () => {
      const validData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        username: 'testuser',
        password: 'testpass',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept repository with project', () => {
      const validData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        project: 'default',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Required fields', () => {
    it('should fail when repo URL is empty', () => {
      const invalidData = {
        type: 'git' as const,
        repo: '',
        insecure: false,
      }

      const result = repositorySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Repository URL is required')
      }
    })

    it('should fail when repo URL is missing', () => {
      const invalidData = {
        type: 'git' as const,
        insecure: false,
      }

      const result = repositorySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Helm-specific validation', () => {
    it('should fail when Helm type has no name', () => {
      const invalidData = {
        type: 'helm' as const,
        repo: 'https://charts.example.com',
        insecure: false,
      }

      const result = repositorySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required for Helm repositories')
        expect(result.error.issues[0].path).toEqual(['name'])
      }
    })

    it('should fail when Helm type has empty name', () => {
      const invalidData = {
        type: 'helm' as const,
        name: '',
        repo: 'https://charts.example.com',
        insecure: false,
      }

      const result = repositorySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required for Helm repositories')
      }
    })

    it('should accept Git type without name', () => {
      const validData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept OCI type without name', () => {
      const validData = {
        type: 'oci' as const,
        repo: 'oci://registry.example.com/charts',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Authentication validation', () => {
    it('should fail when username provided without password', () => {
      const invalidData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        username: 'testuser',
        insecure: false,
      }

      const result = repositorySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Both username and password are required for authentication')
        expect(result.error.issues[0].path).toEqual(['password'])
      }
    })

    it('should fail when password provided without username', () => {
      const invalidData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        password: 'testpass',
        insecure: false,
      }

      const result = repositorySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Both username and password are required for authentication')
      }
    })

    it('should fail when username is empty string', () => {
      const invalidData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        username: '',
        password: 'testpass',
        insecure: false,
      }

      const result = repositorySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Both username and password are required for authentication')
      }
    })

    it('should fail when password is empty string', () => {
      const invalidData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        username: 'testuser',
        password: '',
        insecure: false,
      }

      const result = repositorySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Both username and password are required for authentication')
      }
    })

    it('should accept repository without any auth credentials', () => {
      const validData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should accept all optional fields populated', () => {
      const validData = {
        type: 'helm' as const,
        name: 'my-helm-repo',
        repo: 'https://charts.example.com',
        username: 'testuser',
        password: 'testpass',
        insecure: true,
        project: 'production',
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should handle insecure flag correctly', () => {
      const validDataSecure = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        insecure: false,
      }

      const validDataInsecure = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        insecure: true,
      }

      expect(repositorySchema.safeParse(validDataSecure).success).toBe(true)
      expect(repositorySchema.safeParse(validDataInsecure).success).toBe(true)
    })

    it('should handle long repository URLs', () => {
      const validData = {
        type: 'git' as const,
        repo: 'https://github.com/very-long-organization-name/very-long-repository-name-with-many-characters.git',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should handle special characters in auth fields', () => {
      const validData = {
        type: 'git' as const,
        repo: 'https://github.com/org/repo.git',
        username: 'user@example.com',
        password: 'P@ssw0rd!#$%',
        insecure: false,
      }

      const result = repositorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
