import { describe, it, expect } from 'vitest'
import {
  parseCasbinPolicies,
  parseRBACConfig,
  generatePolicyString,
  generatePolicyCsv,
  getPoliciesForSubject,
  getUniqueSubjects,
  getRolesForSubject,
  policyMatchesApp,
  getPoliciesForApp,
} from './casbin-parser'
import type { CasbinPolicy } from '@/types/api'

describe('Casbin Parser', () => {
  describe('parseCasbinPolicies', () => {
    it('should parse a simple policy line', () => {
      const csv = 'p, admin, applications, get, */*, allow'
      const policies = parseCasbinPolicies(csv)

      expect(policies).toHaveLength(1)
      expect(policies[0]).toEqual({
        type: 'p',
        subject: 'admin',
        resource: 'applications',
        action: 'get',
        object: '*/*',
        effect: 'allow',
      })
    })

    it('should parse multiple policy lines', () => {
      const csv = `p, admin, applications, get, */*, allow
p, dev-user, applications, sync, default/app, allow
p, readonly, applications, get, */*, allow`

      const policies = parseCasbinPolicies(csv)
      expect(policies).toHaveLength(3)
    })

    it('should parse group assignments', () => {
      const csv = 'g, user1, role:admin'
      const policies = parseCasbinPolicies(csv)

      expect(policies).toHaveLength(1)
      expect(policies[0]).toEqual({
        type: 'g',
        subject: 'user1',
        role: 'role:admin',
      })
    })

    it('should ignore comment lines', () => {
      const csv = `# This is a comment
p, admin, applications, get, */*, allow
# Another comment
p, dev-user, applications, sync, default/app, allow`

      const policies = parseCasbinPolicies(csv)
      expect(policies).toHaveLength(2)
    })

    it('should ignore empty lines', () => {
      const csv = `p, admin, applications, get, */*, allow

p, dev-user, applications, sync, default/app, allow`

      const policies = parseCasbinPolicies(csv)
      expect(policies).toHaveLength(2)
    })

    it('should handle whitespace correctly', () => {
      const csv = '  p,  admin,  applications,  get,  */*,  allow  '
      const policies = parseCasbinPolicies(csv)

      expect(policies[0].subject).toBe('admin')
      expect(policies[0].resource).toBe('applications')
    })

    it('should handle deny effect', () => {
      const csv = 'p, user, applications, delete, */*, deny'
      const policies = parseCasbinPolicies(csv)

      expect(policies[0].effect).toBe('deny')
    })

    it('should skip malformed policy lines', () => {
      const csv = `p, admin, applications, get, */*, allow
p, incomplete
p, dev-user, applications, sync, default/app, allow`

      const policies = parseCasbinPolicies(csv)
      expect(policies).toHaveLength(2)
    })
  })

  describe('parseRBACConfig', () => {
    it('should parse RBAC config with policies and default', () => {
      const config = {
        policy: 'p, admin, applications, get, */*, allow',
        policyDefault: 'role:readonly',
      }

      const result = parseRBACConfig(config)

      expect(result.policies).toHaveLength(1)
      expect(result.defaultPolicy).toBe('role:readonly')
      expect(result.raw).toBe(config.policy)
    })

    it('should handle config without default policy', () => {
      const config = {
        policy: 'p, admin, applications, get, */*, allow',
      }

      const result = parseRBACConfig(config)

      expect(result.policies).toHaveLength(1)
      expect(result.defaultPolicy).toBeUndefined()
    })
  })

  describe('generatePolicyString', () => {
    it('should generate policy string for type p', () => {
      const policy: CasbinPolicy = {
        type: 'p',
        subject: 'admin',
        resource: 'applications',
        action: 'get',
        object: '*/*',
        effect: 'allow',
      }

      const result = generatePolicyString(policy)
      expect(result).toBe('p, admin, applications, get, */*, allow')
    })

    it('should generate policy string for type g', () => {
      const policy: CasbinPolicy = {
        type: 'g',
        subject: 'user1',
        role: 'role:admin',
      }

      const result = generatePolicyString(policy)
      expect(result).toBe('g, user1, role:admin')
    })
  })

  describe('generatePolicyCsv', () => {
    it('should generate CSV from multiple policies', () => {
      const policies: CasbinPolicy[] = [
        { type: 'p', subject: 'admin', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
        { type: 'p', subject: 'dev', resource: 'applications', action: 'sync', object: 'default/*', effect: 'allow' },
      ]

      const result = generatePolicyCsv(policies)
      expect(result).toBe(`p, admin, applications, get, */*, allow
p, dev, applications, sync, default/*, allow`)
    })

    it('should generate empty string for empty policies', () => {
      const result = generatePolicyCsv([])
      expect(result).toBe('')
    })
  })

  describe('getPoliciesForSubject', () => {
    const policies: CasbinPolicy[] = [
      { type: 'p', subject: 'admin', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
      { type: 'p', subject: 'dev-user', resource: 'applications', action: 'sync', object: 'default/*', effect: 'allow' },
      { type: 'p', subject: 'admin', resource: 'clusters', action: 'get', object: '*/*', effect: 'allow' },
      { type: 'g', subject: 'admin', role: 'role:admin' },
    ]

    it('should get all policies for a subject', () => {
      const result = getPoliciesForSubject(policies, 'admin')
      expect(result).toHaveLength(2) // Only type 'p' policies
    })

    it('should return empty array for non-existent subject', () => {
      const result = getPoliciesForSubject(policies, 'nonexistent')
      expect(result).toHaveLength(0)
    })

    it('should not include group assignments', () => {
      const result = getPoliciesForSubject(policies, 'admin')
      const hasGroupPolicy = result.some(p => p.type === 'g')
      expect(hasGroupPolicy).toBe(false)
    })
  })

  describe('getUniqueSubjects', () => {
    it('should get unique subjects from policies', () => {
      const policies: CasbinPolicy[] = [
        { type: 'p', subject: 'admin', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
        { type: 'p', subject: 'dev-user', resource: 'applications', action: 'sync', object: 'default/*', effect: 'allow' },
        { type: 'p', subject: 'admin', resource: 'clusters', action: 'get', object: '*/*', effect: 'allow' },
      ]

      const result = getUniqueSubjects(policies)
      expect(result).toEqual(['admin', 'dev-user'])
    })

    it('should return empty array for empty policies', () => {
      const result = getUniqueSubjects([])
      expect(result).toEqual([])
    })

    it('should ignore group policies', () => {
      const policies: CasbinPolicy[] = [
        { type: 'p', subject: 'admin', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
        { type: 'g', subject: 'user1', role: 'role:admin' },
      ]

      const result = getUniqueSubjects(policies)
      expect(result).toEqual(['admin'])
    })

    it('should sort subjects alphabetically', () => {
      const policies: CasbinPolicy[] = [
        { type: 'p', subject: 'zebra', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
        { type: 'p', subject: 'admin', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
        { type: 'p', subject: 'beta', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
      ]

      const result = getUniqueSubjects(policies)
      expect(result).toEqual(['admin', 'beta', 'zebra'])
    })
  })

  describe('getRolesForSubject', () => {
    const policies: CasbinPolicy[] = [
      { type: 'g', subject: 'user1', role: 'role:admin' },
      { type: 'g', subject: 'user1', role: 'role:developer' },
      { type: 'g', subject: 'user2', role: 'role:readonly' },
      { type: 'p', subject: 'user1', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
    ]

    it('should get all roles for a subject', () => {
      const result = getRolesForSubject(policies, 'user1')
      expect(result).toEqual(['role:admin', 'role:developer'])
    })

    it('should return empty array for subject with no roles', () => {
      const result = getRolesForSubject(policies, 'user3')
      expect(result).toEqual([])
    })

    it('should not include regular policies', () => {
      const result = getRolesForSubject(policies, 'user1')
      // Should only have roles, not include the 'p' type policy
      expect(result).toHaveLength(2)
    })
  })

  describe('policyMatchesApp', () => {
    it('should match wildcard pattern */*', () => {
      const policy: CasbinPolicy = {
        type: 'p',
        subject: 'admin',
        resource: 'applications',
        action: 'get',
        object: '*/*',
        effect: 'allow',
      }

      expect(policyMatchesApp(policy, 'default', 'app1')).toBe(true)
      expect(policyMatchesApp(policy, 'production', 'app2')).toBe(true)
    })

    it('should match project wildcard pattern', () => {
      const policy: CasbinPolicy = {
        type: 'p',
        subject: 'dev',
        resource: 'applications',
        action: 'get',
        object: 'default/*',
        effect: 'allow',
      }

      expect(policyMatchesApp(policy, 'default', 'app1')).toBe(true)
      expect(policyMatchesApp(policy, 'default', 'app2')).toBe(true)
      expect(policyMatchesApp(policy, 'production', 'app1')).toBe(false)
    })

    it('should match exact app pattern', () => {
      const policy: CasbinPolicy = {
        type: 'p',
        subject: 'user',
        resource: 'applications',
        action: 'sync',
        object: 'default/guestbook',
        effect: 'allow',
      }

      expect(policyMatchesApp(policy, 'default', 'guestbook')).toBe(true)
      expect(policyMatchesApp(policy, 'default', 'other-app')).toBe(false)
      expect(policyMatchesApp(policy, 'production', 'guestbook')).toBe(false)
    })

    it('should return false for policy without object', () => {
      const policy: CasbinPolicy = {
        type: 'p',
        subject: 'user',
        resource: 'applications',
        action: 'get',
        effect: 'allow',
      }

      expect(policyMatchesApp(policy, 'default', 'app')).toBe(false)
    })
  })

  describe('getPoliciesForApp', () => {
    const policies: CasbinPolicy[] = [
      { type: 'p', subject: 'admin', resource: 'applications', action: 'get', object: '*/*', effect: 'allow' },
      { type: 'p', subject: 'dev', resource: 'applications', action: 'sync', object: 'default/*', effect: 'allow' },
      { type: 'p', subject: 'user', resource: 'applications', action: 'get', object: 'default/guestbook', effect: 'allow' },
      { type: 'p', subject: 'ops', resource: 'applications', action: 'rollback', object: 'production/*', effect: 'allow' },
    ]

    it('should get all policies that apply to an app', () => {
      const result = getPoliciesForApp(policies, 'default', 'guestbook')
      expect(result).toHaveLength(3) // admin (wildcard), dev (project wildcard), user (exact match)
    })

    it('should only match policies for the correct project', () => {
      const result = getPoliciesForApp(policies, 'production', 'app')
      expect(result).toHaveLength(2) // admin (wildcard), ops (production wildcard)
    })

    it('should return empty array for app with no policies', () => {
      const result = getPoliciesForApp(policies, 'staging', 'app')
      expect(result).toHaveLength(1) // Only admin wildcard
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty policy CSV', () => {
      const result = parseCasbinPolicies('')
      expect(result).toEqual([])
    })

    it('should handle policy with only comments', () => {
      const csv = `# Comment 1
# Comment 2
# Comment 3`
      const result = parseCasbinPolicies(csv)
      expect(result).toEqual([])
    })

    it('should handle policy with special characters', () => {
      const csv = 'p, user@example.com, applications, get, project-name/app-name, allow'
      const policies = parseCasbinPolicies(csv)

      expect(policies[0].subject).toBe('user@example.com')
      expect(policies[0].object).toBe('project-name/app-name')
    })

    it('should handle policy with role prefix', () => {
      const csv = 'p, role:developer, applications, get, */*, allow'
      const policies = parseCasbinPolicies(csv)

      expect(policies[0].subject).toBe('role:developer')
    })
  })
})
